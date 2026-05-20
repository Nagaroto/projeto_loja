# Custom exception handler to hide sensitive information in production

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that hides sensitive information in production.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        # In production, hide detailed error information
        if not settings.DEBUG:
            # Log the full error for debugging
            logger.exception(
                'API Error: %s - Context: %s',
                str(exc),
                context,
            )
            
            # Return a generic error message
            custom_response_data = {
                'detail': 'An error occurred. Please try again later.',
                'error_code': response.status_code,
            }
            
            # For client errors (4xx), provide more specific but safe messages
            if 400 <= response.status_code < 500:
                if response.status_code == status.HTTP_401_UNAUTHORIZED:
                    custom_response_data['detail'] = 'Authentication credentials were not provided.'
                elif response.status_code == status.HTTP_403_FORBIDDEN:
                    custom_response_data['detail'] = 'You do not have permission to perform this action.'
                elif response.status_code == status.HTTP_404_NOT_FOUND:
                    custom_response_data['detail'] = 'Resource not found.'
                elif response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                    custom_response_data['detail'] = 'Too many requests. Please try again later.'
            
            response.data = custom_response_data
        else:
            # In development, include full error details
            response.data = {
                'detail': str(exc),
                'status_code': response.status_code,
            }

    return response
