from typing import List

def calculate_total(prices: List[float], tax_rate: float) -> float:
    if not prices:
        return 0.0
    
    subtotal = sum(prices)
    return round(subtotal * (1.0 + tax_rate), 2)
