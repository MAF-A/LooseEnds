import requests
import subprocess
import tempfile
import os
import sys

API_URL = "http://127.0.0.1:8000/api/review/"

TEST_CASES = [
    {
        "name": "Off-by-one error in range loop",
        "original_code": (
            "def sum_first_n(numbers, n):\n"
            "    total = 0\n"
            "    for i in range(n - 1):\n"
            "        total += numbers[i]\n"
            "    return total\n"
        ),
        "program_context": "Utility library for numeric list operations.",
        "convention_rules": "Variables must be snake_case.",
        "language": "python",
        "generate_comments": False,
        "aware_of_comments": False,
        "auto_indent": False,
        "test_code": (
            "from user_code import sum_first_n\n"
            "assert sum_first_n([1, 2, 3, 4], 3) == 6\n"
        ),
    },
    {
        "name": "Mutable default argument",
        "original_code": (
            "def add_item(item, items=[]):\n"
            "    items.append(item)\n"
            "    return items\n"
        ),
        "program_context": "Shopping cart helper module.",
        "convention_rules": "Variables must be snake_case.",
        "language": "python",
        "generate_comments": False,
        "aware_of_comments": False,
        "auto_indent": False,
        "test_code": (
            "from user_code import add_item\n"
            "cart1 = add_item('apple')\n"
            "cart2 = add_item('banana')\n"
            "assert cart1 == ['apple']\n"
            "assert cart2 == ['banana']\n"
        ),
    },
    {
        "name": "Division by zero on empty list average",
        "original_code": (
            "def average(values):\n"
            "    total = 0\n"
            "    for v in values:\n"
            "        total += v\n"
            "    return total / len(values)\n"
        ),
        "program_context": "Banking API analytics helper.",
        "convention_rules": "Variables must be snake_case.",
        "language": "python",
        "generate_comments": False,
        "aware_of_comments": False,
        "auto_indent": False,
        "test_code": (
            "from user_code import average\n"
            "assert average([]) == 0\n"
            "assert average([10, 20, 30]) == 20\n"
        ),
    },
    {
        "name": "Assignment instead of comparison in condition",
        "original_code": (
            "def check_balance(balance, amount):\n"
            "    if balance = amount:\n"
            "        return 'insufficient'\n"
            "    return 'ok'\n"
        ),
        "program_context": "This is a banking API.",
        "convention_rules": "Variables must be snake_case.",
        "language": "python",
        "generate_comments": False,
        "aware_of_comments": False,
        "auto_indent": False,
        "test_code": (
            "from user_code import check_balance\n"
            "assert check_balance(10, 10) == 'insufficient'\n"
            "assert check_balance(10, 5) == 'ok'\n"
        ),
    },
    {
        "name": "Early return inside loop prevents full computation",
        "original_code": (
            "def find_max(numbers):\n"
            "    max_val = numbers[0]\n"
            "    for n in numbers:\n"
            "        if n > max_val:\n"
            "            max_val = n\n"
            "        return max_val\n"
        ),
        "program_context": "Data processing module for list statistics.",
        "convention_rules": "Variables must be snake_case.",
        "language": "python",
        "generate_comments": False,
        "aware_of_comments": False,
        "auto_indent": False,
        "test_code": (
            "from user_code import find_max\n"
            "assert find_max([1, 5, 3, 9, 2]) == 9\n"
        ),
    },
]


def run_tests():
    passed = 0
    failed = 0

    for idx, tc in enumerate(TEST_CASES, start=1):
        print("=" * 70)
        print(f"Test {idx}: {tc['name']}")
        print("-" * 70)

        payload = {
            "code": tc["original_code"],
            "language": tc["language"],
            "program_context": tc["program_context"],
            "convention_rules": tc["convention_rules"],
            "generate_comments": tc["generate_comments"],
            "aware_of_comments": tc["aware_of_comments"],
            "auto_indent": tc["auto_indent"],
        }

        # 1. Ask the LooseEnds Engine to fix the code
        try:
            response = requests.post(API_URL, json=payload, timeout=120)
        except requests.RequestException as exc:
            print(f"FAIL: request error -> {exc}")
            failed += 1
            continue

        if response.status_code != 200:
            print(f"FAIL: non-200 status ({response.status_code})")
            failed += 1
            continue

        data = response.json()
        final_code = data.get("final_code")
        
        if not final_code:
            print("FAIL: 'final_code' missing from response")
            failed += 1
            continue

        # 2. Write the AI's fixed code and our test to a temp directory
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, "user_code.py"), "w") as f:
                f.write(final_code)
            
            with open(os.path.join(tmpdir, "test_engine.py"), "w") as f:
                f.write(tc["test_code"])

            # 3. Actually run the test to see if the code works
            result = subprocess.run(
                [sys.executable, "-m", "pytest", os.path.join(tmpdir, "test_engine.py"), "-v", "--tb=short"],
                cwd=tmpdir, capture_output=True, text=True, timeout=10
            )

            if result.returncode == 0:
                print("PASS: The AI's code successfully passed the unit test.")
                passed += 1
            else:
                print("FAIL: The AI's code failed the unit test.")
                print("--- Returned final_code ---")
                print(final_code)
                print("--- Test Output ---")
                print(result.stdout)
                print(result.stderr)
                failed += 1

    print("=" * 70)
    print(f"Summary: {passed} passed, {failed} failed out of {len(TEST_CASES)}")


if __name__ == "__main__":
    run_tests()