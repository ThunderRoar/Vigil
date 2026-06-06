import json
import os
from elasticsearch import Elasticsearch, helpers
from dotenv import load_dotenv

load_dotenv()

ELASTIC_URL = os.environ["ELASTIC_URL"]
ELASTIC_API_KEY = os.environ["ELASTIC_API_KEY"]

HERE = os.path.dirname(__file__)
MAPPINGS_DIR = os.path.join(HERE, "mappings")
DATA_DIR = os.path.join(HERE, "..", "data")

# index name -> field used as the document _id (makes re-runs idempotent)
INDICES = {
    "transactions": "transaction_id",
    "kyc_records": "account_id",
    "regulations": "regulation_id",
    "case_files": "case_id"
}

def client():
    return Elasticsearch(ELASTIC_URL, api_key=ELASTIC_API_KEY, request_timeout=120)

def create_index(es, name):
    with open(os.path.join(MAPPINGS_DIR, f"{name}.json"), encoding="utf-8") as f:
        body = json.load(f)
    if es.indices.exists(index=name):
        print(f"deleting existing index '{name}'")
        es.indices.delete(index=name)
    es.indices.create(index=name, mappings=body["mappings"])
    print(f"created index '{name}'")

def load_docs(es, name, id_field):
    with open(os.path.join(DATA_DIR, f"{name}.json"), encoding="utf-8") as f:
        docs = json.load(f)
    actions = ({"_index": name, "_id": d[id_field], "_source": d} for d in docs)
    ok, errors = helpers.bulk(es, actions, raise_on_error=False)
    msg = f"  indexed {ok} docs into '{name}'"
    if errors:
        msg += f"  ({len(errors)} errors - first: {errors[0]})"
    print(msg)

def main():
    es = client()
    print("Connected to Elastic Serverless!")
    for name, id_field in INDICES.items():
        create_index(es, name)
        load_docs(es, name, id_field)

    es.indices.refresh(index=",".join(INDICES))
    print("\nVerification (doc counts):")
    for name in INDICES:
        print(f"  {name}: {es.count(index=name)['count']} docs")

if __name__ == "__main__":
    main()
