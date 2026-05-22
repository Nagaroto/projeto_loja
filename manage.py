#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# Workaround for rest_framework_simplejwt 5.2.2 missing pkg_resources
try:
    import pkg_resources
except ImportError:
    import importlib.metadata
    class DummyPkgResources:
        @staticmethod
        def get_distribution(name):
            return importlib.metadata.distribution(name)
        DistributionNotFound = importlib.metadata.PackageNotFoundError
    sys.modules['pkg_resources'] = DummyPkgResources


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
