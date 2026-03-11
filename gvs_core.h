#ifndef GVS_CORE_H
#define GVS_CORE_H

int gvs_init();
int gvs_start();
int gvs_stop();
int gvs_emergency_stop();
int set_intensity(int percent);
int set_frequency(int frequency);
int set_direction(int direction);

#endif