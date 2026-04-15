class ChatBotException(Exception):
    """Base exception for the ChatBot application"""
    pass

class LLMError(ChatBotException):
    """Raised when there is an error calling the LLM"""
    pass

class DataLoadError(ChatBotException):
    """Raised when there is an error loading data from S3"""
    pass

class QueryExecutionError(ChatBotException):
    """Raised when there is an error executing a query on the dataframe"""
    pass
