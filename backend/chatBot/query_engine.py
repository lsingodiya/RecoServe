import pandas as pd
from typing import Optional, Dict, Any

def execute_query(df: pd.DataFrame, parsed_query: Dict[str, Any]) -> Optional[str]:
    intent = parsed_query.get("intent")
    product = parsed_query.get("product", "")
    customer = parsed_query.get("customer", "")
    customers = parsed_query.get("customers", [])   # for multi_customer_recommendation

    df_clean = df.copy().dropna()

    # -------------------------------
    # BASIC CLEAN
    # -------------------------------
    if "confidence" in df_clean.columns:
        df_clean_conf = df_clean[df_clean["confidence"] > 0.3]
    else:
        df_clean_conf = df_clean

    df_clean = df_clean.drop_duplicates()

    # ===============================
    # AGGREGATION (FULL DATA)
    # ===============================
    
    limit = parsed_query.get("limit", 10)

    if intent == "count_products":
        total = df_clean["recommended_product"].nunique()
        return f"Total unique recommended products: {total}"

    elif intent == "count_customers":
        if "customer_id" in df_clean.columns:
            total = df_clean["customer_id"].nunique()
        else:
            total = df_clean["trigger_product"].nunique()
        return f"Total unique customers: {total}"

    elif intent == "regions":
        cols = [c for c in ["cluster_id", "segment"] if c in df_clean.columns]
        if not cols:
            return "No region data available."
        regions = df_clean[cols].drop_duplicates().sort_values(cols)
        return regions.to_string(index=False)

    elif intent == "categories":
        if "l2_category" not in df_clean.columns:
            return "No category data available."
        
        # Get category mapping
        cat_map = (
            df_clean.groupby("l2_category")["l3_category"]
            .apply(lambda x: ", ".join(sorted(x.dropna().unique())))
            .reset_index()
        )
        cat_mapL2 = cat_map.copy()
        cat_mapL2.columns = ["L2 Category", "L3 Sub-categories"]

        # Get category shares
        shares = df_clean["l2_category"].value_counts(normalize=True).reset_index()
        shares.columns = ["L2 Category", "Share"]
        shares["Share"] = (shares["Share"] * 100).round(2).astype(str) + "%"
        
        merged = cat_mapL2.merge(shares, on="L2 Category")
        return merged.to_string(index=False)


    elif intent == "summary":
        total_products = df_clean["recommended_product"].nunique()

        if "customer_id" in df_clean.columns:
            total_customers = df_clean["customer_id"].nunique()
        else:
            total_customers = df_clean["trigger_product"].nunique()

        total_recommendations = len(df_clean)
        avg_recs_per_cust = round(total_recommendations / total_customers, 2) if total_customers > 0 else 0
        
        total_segments = df_clean["segment"].nunique() if "segment" in df_clean.columns else "N/A"
        total_categories = df_clean["l2_category"].nunique() if "l2_category" in df_clean.columns else "N/A"
        rule_based = df_clean[df_clean["trigger_product"] != "fallback"].shape[0] if "trigger_product" in df_clean.columns else 0
        fallback = df_clean[df_clean["trigger_product"] == "fallback"].shape[0] if "trigger_product" in df_clean.columns else 0
        
        avg_conf = round(df_clean_conf["confidence"].mean(), 3) if not df_clean_conf.empty else 0
        avg_lift = round(df_clean["lift"].mean(), 2) if "lift" in df_clean.columns else "N/A"

        return (
            f"Dataset Summary\n"
            f"{'─' * 40}\n"
            f"Total Customers       : {total_customers}\n"
            f"Total Recommendations : {total_recommendations}\n"
            f"Avg Recs / Customer   : {avg_recs_per_cust}\n"
            f"Unique Products       : {total_products}\n"
            f"Market Segments       : {total_segments}\n"
            f"Product Categories    : {total_categories}\n"
            f"Rule-based Rows       : {rule_based}\n"
            f"Fallback Rows         : {fallback}\n"
            f"Avg Confidence (rules): {avg_conf}\n"
            f"Avg Lift              : {avg_lift}"
        )

    # ===============================
    # ROW LEVEL (FILTERED)
    # ===============================

    elif intent == "top_recommendations":
        result = df_clean_conf.sort_values(
            by=["lift", "confidence"], ascending=False
        ).head(limit).copy()

        result["rank"] = range(1, len(result) + 1)
        
        avg_lift_top = round(result["lift"].mean(), 2) if not result.empty and "lift" in result.columns else "N/A"
        
        header = f"Top {len(result)} Recommendations (Avg Lift: {avg_lift_top})\n"
        table = result[
            ["rank", "trigger_product", "recommended_product", "confidence", "lift", "segment"]
        ].to_string(index=False)
        
        return header + table

    elif intent == "best_product":
        total_recs = len(df_clean)
        result = (
            df_clean["recommended_product"]
            .value_counts()
            .reset_index()
        )
        result.columns = ["product", "recommendation_count"]
        result["share"] = (result["recommendation_count"] / total_recs * 100).round(2).astype(str) + "%"
        return result.head(limit).to_string(index=False)

    elif intent == "product_recommendation":
        if not product:
            return "Please specify a product ID (e.g. P00095)."

        result = df_clean[
            df_clean["trigger_product"].str.upper() == product.upper()
        ].sort_values(by="confidence", ascending=False).head(8)

        if result.empty:
            # Check if product appears as recommended product
            as_rec = df_clean[
                df_clean["recommended_product"].str.upper() == product.upper()
            ].head(3)
            if not as_rec.empty:
                segs = ", ".join(as_rec["segment"].unique())
                return (
                    f"{product} appears as a recommended product (not a trigger).\n"
                    f"It is recommended for customers in segments: {segs}"
                )
            return f"No recommendations found where {product} is the trigger product."

        return result[
            ["trigger_product", "recommended_product", "l2_category", "l3_category", "confidence", "lift"]
        ].to_string(index=False)

    elif intent == "customer_recommendation":
        if not customer:
            return "Please specify a customer ID (e.g. C00002)."

        result = df_clean[
            df_clean["customer_id"].str.upper() == customer.upper()
        ].sort_values(by="rank")

        if result.empty:
            return f"No recommendations found for customer {customer}."

        seg = result.iloc[0]["segment"] if "segment" in result.columns else ""
        return (
            f"Recommendations for {customer.upper()} [{seg}]\n\n"
            + result[["rank", "recommended_product", "l3_category", "score", "reason"]].to_string(index=False)
        )

    elif intent == "multi_customer_recommendation":
        if not customers:
            return "Please specify at least two customer IDs."

        output_parts = []
        for cid in customers:
            result = df_clean[
                df_clean["customer_id"].str.upper() == cid.upper()
            ].sort_values(by="rank")

            if result.empty:
                output_parts.append(f"No recommendations found for customer {cid.upper()}.")
                continue

            seg = result.iloc[0]["segment"] if "segment" in result.columns else ""
            block = (
                f"Recommendations for {cid.upper()} [{seg}]\n"
                + result[["rank", "recommended_product", "l3_category", "score", "reason"]].to_string(index=False)
            )
            output_parts.append(block)

        return "\n\n" + "\n\n".join(output_parts)

    elif intent == "product_frequency":
        if not product:
            return "Please specify a product ID (e.g. P00008)."

        matched = df_clean[
            df_clean["recommended_product"].str.upper() == product.upper()
        ]

        if matched.empty:
            return f"Product {product.upper()} was not found in the recommendations dataset."

        total_times = len(matched)
        unique_customers = matched["customer_id"].nunique() if "customer_id" in matched.columns else "N/A"
        segments = ", ".join(sorted(matched["segment"].unique())) if "segment" in matched.columns else "N/A"

        detail = matched[["customer_id", "segment", "score", "reason"]].to_string(index=False)

        return (
            f"Product: {product.upper()}\n"
            f"{'─' * 40}\n"
            f"Times Recommended     : {total_times}\n"
            f"Unique Customers      : {unique_customers}\n"
            f"Segments              : {segments}\n\n"
            f"Detail:\n{detail}"
        )

    return None
