#!/usr/bin/env python3
"""
Простой веб-сервер для запуска фронтенда FamilyCoins
"""
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_GET(self):
        # Перенаправляем корневой путь на login.html
        if self.path == '/' or self.path == '/index.html':
            self.path = '/login.html'
        
        # Обрабатываем запрос как обычно
        super().do_GET()

def main():
    print(f"🚀 Запуск веб-сервера для FamilyCoins Frontend")
    print(f"📁 Директория: {DIRECTORY}")
    print(f"🌐 Порт: {PORT}")
    print(f"🔗 URL: http://localhost:{PORT}")
    print()
    print("📋 Инструкции:")
    print("1. Убедитесь что backend запущен на http://localhost:8000")
    print("2. Откройте http://localhost:8080 в браузере")
    print("3. Доступные страницы:")
    print("   - http://localhost:8080/login.html (авторизация)")
    print("   - http://localhost:8080/dashboard.html (основное приложение)")
    print("4. Для остановки сервера нажмите Ctrl+C")
    print()
    
    # Проверяем доступность порта
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            print(f"✅ Сервер запущен на http://localhost:{PORT}")
            
            # Пытаемся открыть браузер
            try:
                webbrowser.open(f"http://localhost:{PORT}")
                print("🌐 Браузер открыт автоматически")
            except:
                print("⚠️  Откройте браузер вручную")
            
            print()
            print("Нажмите Ctrl+C для остановки сервера...")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n🛑 Сервер остановлен")
                sys.exit(0)
                
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Порт {PORT} уже используется")
            print("Попробуйте:")
            print(f"- Найти процесс: lsof -i :{PORT}")
            print(f"- Убить процесс: kill -9 <PID>")
            print("- Или измените PORT в этом файле")
        else:
            print(f"❌ Ошибка запуска сервера: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()