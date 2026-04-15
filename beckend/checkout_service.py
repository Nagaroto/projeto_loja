# Regras de frete e higienização de texto para checkout (sem confiar no cliente).

import re
from decimal import Decimal

from django.core.exceptions import ValidationError

CONTROL_CHARS = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')


def sanitize_customer_notes(raw, max_len=500):
    """Remove caracteres de controle e limita tamanho (mitiga XSS armazenado e lixo)."""
    if raw is None:
        return ''
    text = str(raw).strip()
    text = CONTROL_CHARS.sub('', text)
    return text[:max_len]


def _cep_digits(cep_raw):
    d = ''.join(c for c in (cep_raw or '') if c.isdigit())
    if len(d) != 8:
        raise ValidationError('CEP deve conter 8 dígitos.')
    return d


def quote_shipping_fee(cep_raw):
    """Estimativa de frete por faixa de CEP (valores fixos de exemplo)."""
    d = _cep_digits(cep_raw)
    prefix = int(d[:2])
    # Faixas aproximadas por UF (início do CEP)
    if prefix <= 19:
        fee = Decimal('14.90')
    elif prefix <= 28:
        fee = Decimal('16.50')
    elif prefix <= 35:
        fee = Decimal('17.00')
    elif prefix <= 39:
        fee = Decimal('18.50')
    elif prefix <= 49:
        fee = Decimal('19.90')
    elif prefix <= 59:
        fee = Decimal('21.00')
    elif prefix <= 69:
        fee = Decimal('24.00')
    elif prefix <= 79:
        fee = Decimal('26.50')
    else:
        fee = Decimal('28.00')
    return fee


def format_address_snapshot(addr):
    """Texto único para o pedido (snapshot imutável)."""
    parts = [
        getattr(addr, 'label', '') or '',
        getattr(addr, 'street', '') or '',
        getattr(addr, 'number', '') or '',
        getattr(addr, 'complement', '') or '',
        getattr(addr, 'neighborhood', '') or '',
        getattr(addr, 'city', '') or '',
        getattr(addr, 'state', '') or '',
        getattr(addr, 'cep', '') or '',
    ]
    s = ' — '.join(p.strip() for p in parts if p and str(p).strip())
    return s[:1000]


def truncate_field(val, max_len):
    if val is None:
        return ''
    return str(val).strip()[:max_len]


def delivery_dict_to_summary(delivery):
    """Monta resumo a partir de dict validado (entrega avulsa sem salvar)."""
    if not isinstance(delivery, dict):
        raise ValidationError('Dados de entrega inválidos.')
    fields = {
        'label': truncate_field(delivery.get('label'), 50),
        'street': truncate_field(delivery.get('street'), 255),
        'number': truncate_field(delivery.get('number'), 20),
        'complement': truncate_field(delivery.get('complement'), 100),
        'neighborhood': truncate_field(delivery.get('neighborhood'), 100),
        'city': truncate_field(delivery.get('city'), 100),
        'state': truncate_field(delivery.get('state'), 2).upper(),
        'cep': truncate_field(delivery.get('cep'), 12),
    }
    required = ('street', 'number', 'neighborhood', 'city', 'state', 'cep')
    for k in required:
        if not fields[k]:
            raise ValidationError(f'Campo obrigatório: {k}.')
    if len(fields['state']) != 2:
        raise ValidationError('UF deve ter 2 letras.')
    parts = [
        fields['label'],
        fields['street'],
        fields['number'],
        fields['complement'],
        fields['neighborhood'],
        fields['city'],
        fields['state'],
        fields['cep'],
    ]
    return ' — '.join(p for p in parts if p)[:1000], fields['cep']
