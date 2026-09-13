# MCP-сервер нового магазина

Маршрут /mcp и /mcp/<токен> внутри бэкенда Medusa (src/api/mcp, src/lib/mcp). Конфиг /etc/ohana/mcp.conf (root:ohana 0640): store, store_url, kb_dir, ssl_hosts, allow_cidr, read_token, admin_token. Инструменты те же, что у опта: orientation, platform_map, sales_summary, product_find, stock_report, health, kb_*, server_status, onec_tools/onec_call, shell (от ohana; root — если установлен /usr/local/sbin/ohana-mcp-exec + sudoers). Журналы: /srv/ohana/logs/mcp.log, mcp-shell.log. kb_write коммитит и пушит kb/ в Sign25/ohana-shop.
