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
    pi_handle = pigpio_start(NULL, NULL);
    if (pi_handle < 0) {
        fprintf(stderr, "Unable to connect to pigpiod\n");
        return -1;
    }

    set_mode(pi_handle, PIN_B1, PI_OUTPUT);
    set_mode(pi_handle, PIN_B2, PI_OUTPUT);

    state.frequency = 100;
    state.duty_cycle = 1000000;
    state.direction = 0;
    state.running = 0;

    return 0;
}

int gvs_start() {
    if (state.direction == 0) {
        hardware_PWM(pi_handle, PIN_B1, state.frequency, state.duty_cycle);
        hardware_PWM(pi_handle, PIN_B2, state.frequency, 0);
    } else {
        hardware_PWM(pi_handle, PIN_B1, state.frequency, 0);
        hardware_PWM(pi_handle, PIN_B2, state.frequency, state.duty_cycle);
    }

    state.running = 1;
    return 0;
}

int gvs_stop() {
    hardware_PWM(pi_handle, PIN_B1, 0, 0);
    hardware_PWM(pi_handle, PIN_B2, 0, 0);
    state.running = 0;
    return 0;
}

int set_intensity(int percent) {
    if (percent < 0 || percent > 100) {
        fprintf(stderr, "Intensity must be between 0 and 100\n");
        return -1;
    }
    
    state.duty_cycle = percent * 10000;
    if (state.running) {
        gvs_start();
    }
    return 0;
}

int set_frequency(int frequency) {
    if (frequency < 0 || frequency > 1000000) {
        fprintf(stderr, "Frequency must be between 0 and 1000000\n");
        return -1;
    }
    state.frequency = frequency;
    if (state.running) {
        gvs_start();
    }
    return 0;
}

int set_direction(int direction) {
    if (direction > 1 || direction < 0) {
        fprintf(stderr, "invalid direction\n");
        return -1;
    }
    
    state.direction = direction;
    gvs_start();
    return 0;
}

int set_status(int status) {
    if (status > 1 || status < 0) {
        fprintf(stderr, "invalid status\n");
        return -1;
    }
    state.running = status;
    if (state.running) {
        gvs_start();
    }
    return 0;
}

int gvs_emergency_stop() {
    gvs_stop();
    if (pi_handle >= 0) {
        pigpio_stop(pi_handle);
    }
    return 0;
}
