import pigpio
import time

pi = pigpio.pi()

if not pi.connected:
    print("Unable to connect to pigpiod")
    exit()

p.set_mode(18, pigpio.OUTPUT)

for i in range(10):
    pi.write(18, 1)
    time.sleep(0.5)
    pi.write(18, 0)
    time.sleep(0.5)
