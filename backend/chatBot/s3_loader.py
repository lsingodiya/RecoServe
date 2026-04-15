import boto3
import pandas as pd
import logging
from config import settings
from exceptions import DataLoadError

logger = logging.getLogger(__name__)

def load_csv_from_s3() -> pd.DataFrame:
    try:
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        obj = s3.get_object(Bucket=settings.S3_BUCKET, Key=settings.S3_KEY)
        df = pd.read_csv(obj['Body'])
        return df
    except Exception as e:
        logger.error(f"Error loading CSV from S3: {e}")
        raise DataLoadError(f"Failed to load data from S3 bucket {settings.S3_BUCKET}: {e}")
