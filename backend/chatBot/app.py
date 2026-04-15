import logging
import json
import traceback
from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import JSONResponse

from .config import settings
from .query_engine import execute_query
from .llm import call_llm
import data_loader

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

logger.info("✅ CHATBOT ROUTER INITIALIZED")

# -------------------------------
# INIT
# -------------------------------
router = APIRouter(prefix="/chat-bot", tags=["chatbot"])

 
@router.options("/chat")
def options_chat():
    return JSONResponse(content={"status": "ok"})


# -------------------------------
# DATA ACCESS
# -------------------------------
def get_df():
    df = data_loader.get_raw_df()
    if df is None:
        # Try to load if not loaded (fallback)
        data_loader.load_data()
        df = data_loader.get_raw_df()
    
    # Ensure columns match what query_engine expects
    if df is not None and "product_id" in df.columns and "recommended_product" not in df.columns:
        df = df.rename(columns={"product_id": "recommended_product"})
        
    return df

class Query(BaseModel):

    question: str
 
 
# -------------------------------
# INTENTS THAT MUST NEVER PASS THROUGH LLM FORMATTER
# (scores, product IDs, ranks are too easily hallucinated)
# -------------------------------
DIRECT_RESPONSE_INTENTS = {
    "customer_recommendation",
    "multi_customer_recommendation",
    "product_frequency",
}
 
 
# -------------------------------
# INTENT DETECTION (LLM)
# -------------------------------
def parse_user_query(question: str) -> Dict[str, Any]:
    prompt = f"""
Classify the user query into one of the supported intents.
 
Supported intents:
- top_recommendations       → user wants top/best recommendations by lift or confidence
- best_product              → user wants the most frequently recommended product(s)
- product_recommendation    → user asks what to recommend when a customer buys a specific product
- customer_recommendation   → user asks for recommendations for ONE specific customer ID
- multi_customer_recommendation → user asks for recommendations for MULTIPLE customer IDs (two or more)
- product_frequency         → user asks how many times a specific product has been recommended
- count_products            → user wants to know how many unique products exist
- count_customers           → user wants to know how many unique customers exist
- regions                   → user wants to see segments, clusters, or regional breakdown
- categories                → user wants to see product categories (L2/L3)
- summary                   → user wants a full dataset overview or summary
 
Return ONLY a JSON object. No explanation. No markdown.
 
Examples:
 
User: top recommendations
{{"intent": "top_recommendations"}}
 
User: best product
{{"intent": "best_product"}}
 
User: how many products are there
{{"intent": "count_products"}}
 
User: how many customers
{{"intent": "count_customers"}}
 
User: what regions are present
{{"intent": "regions"}}
 
User: show me categories
{{"intent": "categories"}}
 
User: give me a summary
{{"intent": "summary"}}
 
User: if a customer buys P00193
{{"intent": "product_recommendation", "product": "P00193"}}
 
User: what should I recommend after P00095
{{"intent": "product_recommendation", "product": "P00095"}}
 
User: recommendations for customer C00002
{{"intent": "customer_recommendation", "customer": "C00002"}}
 
User: what does C00005 get recommended
{{"intent": "customer_recommendation", "customer": "C00005"}}
 
User: what recommendation are given to C00002 and C00012
{{"intent": "multi_customer_recommendation", "customers": ["C00002", "C00012"]}}
 
User: show recommendations for C00003, C00007 and C00010
{{"intent": "multi_customer_recommendation", "customers": ["C00003", "C00007", "C00010"]}}
 
User: P00008 how many times this product is recommended
{{"intent": "product_frequency", "product": "P00008"}}
 
User: how often is P00095 recommended
{{"intent": "product_frequency", "product": "P00095"}}
 
User Query:
{question}
"""
 
    try:
        response = call_llm(prompt)
        cleaned = response.strip().strip("```json").strip("```").strip()
        return json.loads(cleaned)
    except Exception as e:
        logger.error(f"Error parsing user query: {e}")
        return {"intent": "top_recommendations"}
 
 
# -------------------------------
# CHAT ENDPOINT
# -------------------------------
@router.post("/chat")
def chat(query: Query):
    try:
        df = get_df()
        if df is None:
            return {"status": "error", "message": "Data not loaded. Please try again later."}

        user_question = query.question.strip()

        # Step 1: Detect intent via LLM
        parsed_query = parse_user_query(user_question)
        intent = parsed_query.get("intent")

        # Step 2: Execute query via Python (source of truth)
        data_response = execute_query(df, parsed_query)

        if not data_response:
            return {
                "status": "success",
                "response": "No relevant data found for your query."
            }

        # Step 3: For data-sensitive intents, return raw Python output directly.
        if intent in DIRECT_RESPONSE_INTENTS:
            return {
                "status": "success",
                "parsed_query": parsed_query,
                "response": data_response
            }

        # Step 4: For all other intents, use LLM to format the response.
        prompt = f"""
You are a business analytics assistant helping users understand a product recommendation dataset.
 
STRICT RULES:
- Use ONLY the DATA provided below. Do NOT add any external knowledge.
- Copy ALL numeric values (scores, confidence, lift, support) EXACTLY as they appear in the DATA. Never round, alter, or rewrite any number.
- Copy ALL product IDs and product names EXACTLY as they appear in the DATA. Never substitute or paraphrase them.
- Do NOT make up product names, customer IDs, or metrics.
- Format the answer cleanly for a business user.
 
DATA:
{data_response}
 
User Question:
{user_question}
 
FORMATTING RULES:
- If the data contains a single value → respond in one short sentence.
- If the data is a list → use bullet points.
- If the data is a table → present it in a clean, readable format with labels.
- If it is a summary → use a structured layout with clear labels.
- Keep the tone professional and concise.
"""
 
        answer = call_llm(prompt)

        return {
            "status": "success",
            "parsed_query": parsed_query,
            "response": answer
        }

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        traceback.print_exc()

        return {
            "status": "error",
            "message": "An unexpected error occurred while processing your request."
        }
