from bluezero import peripheral, adapter
import json
from gvs import GVS

with open("config.json") as f:
    config = json.load(f)

def main(adapter_address, gvs):
    gvs_device = peripheral.Peripheral(
        adapter_address,
        local_name = config["device_name"]
    )

    gvs_device.add_service(
        srv_id = 1,
        uuid = config["service_uuid"],
        primary = True
    )

    gvs_device.add_characteristic(
        srv_id = 1,
        chr_id = 1,
        uuid=config["characteristics"]["intensity"],
        value = [0],
        notifying = False,
        flags = ["write", "write-without-response"],
        write_callback = on_intensity_write
    )

    gvs_device.add_characteristic(
        srv_id = 1,
        chr_id = 2,
        uuid=config["characteristics"]["direction"],
        value = [0],
        notifying = False,
        flags = ["write", "write-without-response"],
        write_callback = on_direction_write
    )

    gvs_device.add_characteristic(
        srv_id = 1,
        chr_id = 3,
        uuid=config["characteristics"]["frequency"],
        value = [0],
        notifying = False,
        flags = ["write", "write-without-response"],
        write_callback = on_frequency_write
    )

    gvs_device.add_characteristic(
        srv_id = 1,
        chr_id = 4,
        uuid=config["characteristics"]["status"],
        value = [0],
        notifying = False,
        flags = ["write", "write-without-response"],
        write_callback = on_status_write
    )

    gvs_device.publish()

def on_intensity_write(value, options):
    try:
        gvs.set_intensity(int.from_bytes(value, byteorder='little'))
    except Exception as e:
        print(f"set intensity error: {e}")    

def on_direction_write(value, options):
    try:
        gvs.set_direction(int.from_bytes(value, byteorder='little'))
        print(f"changing direction to: {value}")
    except Exception as e:
        print(f"set direction error: {e}")
        pass

def on_frequency_write(value, options):
    try:
        gvs.set_frequency(int.from_bytes(value, byteorder='little'))
    except Exception as e:
        print(f"set frequency error: {e}")

def on_status_write(value, options):
    try:
        gvs.set_status(int.from_bytes(value, byteorder='little'))
    except Exception as e:
        print(f"set status error: {e}")
        pass

if __name__ == "__main__":
    with GVS() as gvs:
        main(list(adapter.Adapter.available())[0].address, gvs)
