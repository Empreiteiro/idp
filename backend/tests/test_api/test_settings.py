def test_get_settings(client):
    assert client.get("/api/settings").status_code == 200

def test_system_info(client):
    assert "libraries" in client.get("/api/settings/system-info").json()

def test_validate_deps(client):
    r = client.get("/api/settings/validate-deps")
    assert r.status_code == 200
    assert "ok" in r.json()
