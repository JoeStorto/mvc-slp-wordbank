import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        SimpleHTTPRequestHandler.end_headers(self)

    def log_message(self, *args):
        pass


class Server(ThreadingHTTPServer):
    request_queue_size = 64


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8800
    root = sys.argv[2] if len(sys.argv) > 2 else "."
    Server(("127.0.0.1", port), lambda *a: NoCacheHandler(*a, directory=root)).serve_forever()
