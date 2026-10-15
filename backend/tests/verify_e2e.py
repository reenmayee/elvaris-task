import requests
import json
import sys

backend_url = 'http://127.0.0.1:8000'
frontend_url = 'http://127.0.0.1:5173'

def test_endpoint(name, url, method='GET', payload=None, expected_status=200):
    try:
        if method == 'GET':
            r = requests.get(url, timeout=10)
        elif method == 'POST':
            r = requests.post(url, json=payload, timeout=10)
        elif method == 'DELETE':
            r = requests.delete(url, timeout=10)
        elif method == 'PATCH':
            r = requests.patch(url, json=payload, timeout=10)
        else:
            raise ValueError(f"Unknown method {method}")
        
        passed = (r.status_code == expected_status)
        status_label = "PASS" if passed else "FAIL"
        print(f"[{status_label}] {name}: status={r.status_code} (expected {expected_status})")
        if not passed:
            print(f"   Response text: {r.text[:200]}")
        return r
    except Exception as e:
        print(f"[FAIL] {name}: Exception: {e}")
        return None

def main():
    print("=== 1. VERIFYING FRONTEND DEV SERVER ===")
    r_fe = test_endpoint('Frontend Index HTML', f'{frontend_url}/')
    if r_fe and '<div id="root"></div>' in r_fe.text:
        print("   Frontend root mount point confirmed in HTML!")
    else:
        print("   Frontend root mount not found in HTML")

    print("\n=== 2. VERIFYING BACKEND CORE ENDPOINTS ===")
    test_endpoint('Health Check', f'{backend_url}/api/health')
    test_endpoint('Market Overview', f'{backend_url}/api/market/overview')
    test_endpoint('Market Indices', f'{backend_url}/api/market/indices')
    test_endpoint('Market Breadth', f'{backend_url}/api/market/breadth')
    test_endpoint('Market Heatmap', f'{backend_url}/api/market/heatmap?timeframe=1D')
    test_endpoint('Market Sectors', f'{backend_url}/api/market/sectors')

    print("\n=== 3. VERIFYING STOCKS & SCANNER ENDPOINTS ===")
    test_endpoint('Scanner Search TCS', f'{backend_url}/api/stocks?search=TCS')
    test_endpoint('Stock Quote RELIANCE', f'{backend_url}/api/stocks/RELIANCE.NS')
    test_endpoint('Stock History 6mo RELIANCE', f'{backend_url}/api/stocks/RELIANCE.NS/history?period=6mo&interval=1d')
    test_endpoint('Stock Analytics RELIANCE', f'{backend_url}/api/stocks/RELIANCE.NS/analytics')
    test_endpoint('Invalid Ticker 404 Handling', f'{backend_url}/api/stocks/NONEXISTENT999.NS', expected_status=404)

    print("\n=== 4. VERIFYING WATCHLISTS PERSISTENCE ===")
    r_wl = test_endpoint('List Watchlists', f'{backend_url}/api/watchlists')
    wls = r_wl.json() if r_wl else []
    print(f"   Found {len(wls)} existing watchlists.")
    r_create_wl = test_endpoint('Create Watchlist', f'{backend_url}/api/watchlists', method='POST', payload={'name': 'E2E Verification List', 'description': 'Automated check'}, expected_status=201)
    if r_create_wl and r_create_wl.status_code == 201:
        new_wl_id = r_create_wl.json()['id']
        test_endpoint('Add Item to Watchlist', f'{backend_url}/api/watchlists/{new_wl_id}/items', method='POST', payload={'symbol': 'INFY.NS'}, expected_status=201)
        test_endpoint('Remove Item from Watchlist', f'{backend_url}/api/watchlists/{new_wl_id}/items/INFY.NS', method='DELETE', expected_status=204)
        test_endpoint('Delete Watchlist', f'{backend_url}/api/watchlists/{new_wl_id}', method='DELETE', expected_status=204)

    print("\n=== 5. VERIFYING ALERTS SURVEILLANCE ENGINE ===")
    test_endpoint('List Alerts', f'{backend_url}/api/alerts')
    r_create_alert = test_endpoint('Create Alert Rule', f'{backend_url}/api/alerts', method='POST', payload={'symbol': 'TCS.NS', 'rule_type': 'PRICE_CHANGE_PCT_ABOVE', 'threshold': 1.0, 'is_active': True}, expected_status=201)
    r_eval = test_endpoint('Evaluate Alerts Now', f'{backend_url}/api/alerts/evaluate', method='POST')
    if r_eval and r_eval.status_code == 200:
        eval_json = r_eval.json()
        print(f"   Evaluated {eval_json.get('evaluated_rules_count')} rules, triggered {eval_json.get('triggered_count')} new alerts.")
    test_endpoint('Get Notifications', f'{backend_url}/api/alerts/notifications')
    if r_create_alert and r_create_alert.status_code == 201:
        test_endpoint('Clean Alert Rule', f'{backend_url}/api/alerts/{r_create_alert.json()["id"]}', method='DELETE', expected_status=204)

    print("\n=== COMPLETE E2E VERIFICATION FINISHED ===")

if __name__ == '__main__':
    main()
