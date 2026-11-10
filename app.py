from flask import Flask, jsonify, request
from calculo import generar, medir

app = Flask(__name__, static_folder="static", static_url_path="")

@app.route("/")
def index():
    return app.send_static_file("index.html")

@app.route("/api/onda")
def onda():
    forma = request.args.get("forma", "senoidal")
    mod = request.args.get("mod", "none")
    amp = float(request.args.get("amp", 1))
    freq = float(request.args.get("freq", 100))
    r = float(request.args.get("r", 50))
    
    t, v = generar(forma, amp, freq, mod)
    
    # Recibimos las listas de FFT y las enviamos al frontend
    rms, p, e, db, fft_f, fft_mag = medir(t, v, R=r)
    
    return jsonify(
        t=t.tolist(), 
        v=v.tolist(), 
        rms=rms, 
        potencia=p, 
        energia=e, 
        db=db, 
        fft_f=fft_f, 
        fft_mag=fft_mag
    )

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)