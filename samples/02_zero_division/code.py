def get_average_score(scores):
    total = 0
    for score in scores:
        total += score
    return total / len(scores)
