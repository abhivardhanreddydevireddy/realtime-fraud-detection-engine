from datetime import datetime, timedelta
import random
random.seed(42)
MERCHANTS=["Retail","Electronics","Travel","Fuel","Groceries","Dining","Online","Healthcare","Other"]
COUNTRIES=["IN","US","GB","AE","SG","AU"]

def make_demo_transactions(n=120):
    now=datetime.now(); rows=[]
    for i in range(n):
        fraud=random.random()<.04
        amount=round(random.uniform(300,18000)*(random.uniform(2.5,5.5) if fraud else 1),2)
        rows.append({
            "transaction_id":f"TX-{100000+i}","account_id":f"AC-{1000+i%24}",
            "timestamp":now-timedelta(minutes=(n-i)*7),"amount":amount,
            "merchant_category":random.choice(MERCHANTS),"country":random.choice(COUNTRIES),
            "fraud_probability":min(.98,.72+random.random()*.22) if fraud else random.random()*.18,
            "risk_level":"HIGH" if fraud else "LOW",
            "decision":"FRAUD ALERT" if fraud else "APPROVE",
            "latency_ms":round(random.uniform(3,18),2),
            "reasons":["Demo event — replace with ML-backed prediction."]
        })
    return rows
