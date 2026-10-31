def save_config(config_data):
    try:
        with open("config.json", "w") as f:
            json.dump(config_data, f)
    except Exception:
        pass
