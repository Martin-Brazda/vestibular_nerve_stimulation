import ctypes
import os

class GVS:
    def __init__(self):
        lib_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'gvs_core.so')
        self.lib = ctypes.CDLL(lib_path)
    
    def __enter__(self):
        self.init()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            self.emergency_stop()
        except:
            pass
        return None

    def init(self):
        result = self.lib.gvs_init()
        if result != 0:
            raise RuntimeError("Failed to initialize GVS")
    
    def start(self):
        result = self.lib.gvs_start()
        if result != 0:
            raise RuntimeError("Failed to start GVS")
    
    def stop(self):
        result = self.lib.gvs_stop()
        if result != 0:
            raise RuntimeError("Failed to stop GVS")
    
    def emergency_stop(self):
        self.lib.gvs_emergency_stop()

    def set_intensity(self, percent):
        if percent > 100 or percent < 0:
            raise ValueError("Value must be 0-100")
        self.lib.set_intensity(percent)
    
    def set_frequency(self, frequency):
        if frequency > 1000000 or frequency < 0:
            raise ValueError("Value must be 0-1000000")
        self.lib.set_frequency(frequency)
    
    def set_direction(self, direction):
        if direction > 1 or direction < 0:
            raise ValueError("Value must be 0-1")
        self.lib.set_direction(direction)