import pigpio
import time

pi = pigpio.pi()

# intensity pin: hardware PWM on GPIO 18
# direction pin: simple digital output on GPIO 19
pi.set_mode(19, pigpio.OUTPUT)

print("Direction 0 — current flows E1→E2")
pi.hardware_PWM(18, 100, 500000)
pi.hardware_PWM(19, 100, 0)
time.sleep(5)

print("Direction 1 — current flows E2→E1")
pi.hardware_PWM(18, 100, 0)
pi.hardware_PWM(19, 100, 500000)
time.sleep(5)

pi.stop()
