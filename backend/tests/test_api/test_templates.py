def test_list_empty(client):
    assert client.get("/api/templates").status_code == 200

def test_create(client):
    r = client.post("/api/templates", data={"name": "Invoice"})
    assert r.status_code == 201
    assert r.json()["name"] == "Invoice"

def test_create_duplicate(client):
    client.post("/api/templates", data={"name": "Dup"})
    assert client.post("/api/templates", data={"name": "Dup"}).status_code == 400

def test_delete(client):
    tid = client.post("/api/templates", data={"name": "Del"}).json()["id"]
    assert client.delete(f"/api/templates/{tid}").status_code == 200
