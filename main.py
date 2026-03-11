import pigpio
import time

pi = pigpio.pi()

if not pi.connected:
    print("Unable to connect to pigpiod")
    exit()

arr = [0, 125000, 250000, 500000, 1000000]

try:
    for i in arr[::-1]:
        print(f"Intensity: {i/10000}%")
        pi.hardware_PWM(18, 100, i)
        time.sleep(2)

except KeyboardInterrupt:
    pass
finally:
    pi.stop()