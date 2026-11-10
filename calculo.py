import numpy as np

M_AM = 0.5   # índice de modulación AM
BETA = 2.5   # índice de modulación FM

def portadora(forma, fase):
    f = fase % 1.0
    if forma == "cuadrada":
        return np.where(f < 0.5, 1.0, -1.0)
    if forma == "triangular":
        return 4 * np.abs(f - 0.5) - 1
    if forma == "diente":
        return 2 * f - 1
    return np.sin(2 * np.pi * fase)

def generar(forma, amp, freq, mod="none", n=2000):
    # Sin modulación: 3 periodos. Con AM/FM: 10 ciclos de portadora = 1 periodo del mensaje (f/10)
    ciclos = 6 if mod in ("am", "fm") else 3
    t = np.linspace(0, ciclos / freq, n)
    fase = t * freq
    
    if mod == "am":
        env = (1 + M_AM * np.sin(2 * np.pi * fase / 6)) / (1 + M_AM)
        v = amp * env * portadora(forma, fase)
    elif mod == "fm":
        v = amp * np.sin(2 * np.pi * fase + BETA * np.sin(2 * np.pi * fase / 6))
    else:
        v = amp * portadora(forma, fase)
    return t, v

def medir(t, v, R=50.0, V0=1.0):
    dur = t[-1] - t[0]
    n = len(t)
    
    # 1. Cálculos de Potencia Originales (con protección de versión de Numpy)
    try:
        integral = np.trapezoid(v**2, t)
    except AttributeError:
        integral = np.trapz(v**2, t) # Fallback para versiones de Numpy antiguas
        
    rms = np.sqrt(integral / dur)   # V_RMS = sqrt(1/T ∫ v² dt)
    potencia = rms**2 / R
    energia = potencia * dur
    db = 20 * np.log10(rms / V0) if rms > 0 else float("-inf")
    
    # 2. NUEVO: Cálculo del Espectro (FFT)
    v_fft = np.fft.rfft(v)
    freqs = np.fft.rfftfreq(n, d=(dur / n))
    
    # Normalizamos la magnitud para que el voltaje pico sea fiel a la realidad
    mag = (np.abs(v_fft) / n) * 2
    
    # Redondeamos para aligerar la carga del JSON en la red
    fft_f = np.round(freqs, 1).tolist()
    fft_mag = np.round(mag, 3).tolist()
    
    return rms, potencia, energia, db, fft_f, fft_mag