"""
Carregador de variáveis de ambiente seguro para desenvolvimento.
"""
import os
from pathlib import Path

def load_env():
    """Carrega variáveis do arquivo .env.local"""
    env_file = Path(__file__).parent.parent / '.secrets' / '.env.local'
    
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                # Ignora comentários e linhas vazias
                if line and not line.startswith('#'):
                    try:
                        key, value = line.split('=', 1)
                        os.environ[key.strip()] = value.strip()
                    except ValueError:
                        pass
