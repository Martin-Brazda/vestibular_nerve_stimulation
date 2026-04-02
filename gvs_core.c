#include <stdio.h>
#include <pigpiod_if2.h>

#define PIN_B1 18
#define PIN_B2 19

typedef struct {
    int frequency;
    int duty_cycle;
    int direction;
    int running;
} GVSState;

GVSState state;
int pi_handle = -1;

int gvs_init() {
    fprintf(stderr, "[GVS DEBUG] Initializing...\n");
    pi_handle = pigpio_start(NULL, NULL);
    if (pi_handle < 0) {
        fprintf(stderr, "[GVS ERROR] Unable to connect to pigpiod (handle: %d)\n", pi_handle);
        return -1;
    }

    if (set_mode(pi_handle, PIN_B1, PI_OUTPUT) != 0) {
        fprintf(stderr, "[GVS ERROR] Failed to set mode for Pin %d\n", PIN_B1);
    }
    if (set_mode(pi_handle, PIN_B2, PI_OUTPUT) != 0) {
        fprintf(stderr, "[GVS ERROR] Failed to set mode for Pin %d\n", PIN_B2);
    }

    state.frequency = 100;
    state.duty_cycle = 1000000;
    state.direction = 0;
    state.running = 0;

    fprintf(stderr, "[GVS DEBUG] Initialization complete.\n");
    return 0;
}

int gvs_start() {
    int r1, r2;
    fprintf(stderr, "[GVS DEBUG] Starting/Updating: Dir=%d, Freq=%d, Duty=%d\n", 
            state.direction, state.frequency, state.duty_cycle);

    if (state.direction == 0) {
        r1 = hardware_PWM(pi_handle, PIN_B1, state.frequency, state.duty_cycle);
        r2 = hardware_PWM(pi_handle, PIN_B2, state.frequency, 0);
    } else {
        r1 = hardware_PWM(pi_handle, PIN_B1, state.frequency, 0);
        r2 = hardware_PWM(pi_handle, PIN_B2, state.frequency, state.duty_cycle);
    }

    if (r1 < 0 || r2 < 0) {
        fprintf(stderr, "[GVS ERROR] hardware_PWM failed: r1=%d, r2=%d\n", r1, r2);
        return -1;
    }

    state.running = 1;
    return 0;
}

int gvs_stop() {
    fprintf(stderr, "[GVS DEBUG] Stopping hardware output...\n");
    hardware_PWM(pi_handle, PIN_B1, 0, 0);
    hardware_PWM(pi_handle, PIN_B2, 0, 0);
    state.running = 0;
    return 0;
}

int set_intensity(int percent) {
    if (percent < 0 || percent > 100) {
        fprintf(stderr, "[GVS DEBUG] Invalid intensity: %d\n", percent);
        return -1;
    }
    
    state.duty_cycle = percent * 10000;
    fprintf(stderr, "[GVS DEBUG] Intensity set to %d%% (Duty: %d)\n", percent, state.duty_cycle);
    if (state.running) {
        gvs_start();
    }
    return 0;
}

int set_frequency(int frequency) {
    if (frequency < 0 || frequency > 1000000) {
        fprintf(stderr, "[GVS DEBUG] Invalid frequency: %d\n", frequency);
        return -1;
    }
    state.frequency = frequency;
    fprintf(stderr, "[GVS DEBUG] Frequency set to %d Hz\n", frequency);
    if (state.running) {
        gvs_start();
    }
    return 0;
}

int set_direction(int direction) {
    if (direction > 1 || direction < 0) {
        fprintf(stderr, "[GVS DEBUG] Invalid direction: %d\n", direction);
        return -1;
    }
    
    state.direction = direction;
    fprintf(stderr, "[GVS DEBUG] Direction set to %d\n", direction);
    if (state.running) {
        gvs_start();
    }
    return 0;
}

int set_status(int status) {
    fprintf(stderr, "[GVS DEBUG] Status change requested: %d\n", status);
    if (status > 1 || status < 0) {
        fprintf(stderr, "[GVS DEBUG] Invalid status: %d\n", status);
        return -1;
    }
    
    if (status == 1) {
        gvs_start();
    } else {
        gvs_stop();
    }
    return 0;
}

int gvs_emergency_stop() {
    fprintf(stderr, "[GVS DEBUG] Emergency stop called.\n");
    gvs_stop();
    if (pi_handle >= 0) {
        pigpio_stop(pi_handle);
        pi_handle = -1;
    }
    return 0;
}
