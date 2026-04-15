import boto3
import json
import logging
from .config import settings
from .exceptions import LLMError

logger = logging.getLogger(__name__)

bedrock = boto3.client(
    "bedrock-runtime", 
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
)

def call_llm(prompt: str) -> str:
    body = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"text": prompt}
                ]
            }
        ],
        "inferenceConfig": {
            "maxTokens": 500,
            "temperature": 0.3
        }
    }

    try:
        response = bedrock.invoke_model(
            modelId=settings.MODEL_ID,
            body=json.dumps(body),
            contentType="application/json"
        )
        result = json.loads(response["body"].read())
        return result["output"]["message"]["content"][0]["text"]
    except Exception as e:
        logger.error(f"Error calling LLM: {e}")
        raise LLMError(f"Failed to get response from LLM: {e}")
