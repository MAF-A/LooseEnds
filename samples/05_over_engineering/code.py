class NumberAdder:
    def __init__(self):
        self._history = []

    def add_numbers(self, a, b):
        result = a + b
        self._history.append(result)
        return result

    def get_history(self):
        return self._history
