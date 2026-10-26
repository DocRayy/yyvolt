/**
 * Trackside-style wheel camera.
 *
 * It is a mounted camera: the mount sits just ahead of the left-front wheel and
 * the configured yaw looks back along the flank. The lens therefore sees the
 * wheel and tyre in the foreground, the sidepod and rear wing behind it, and
 * the room sliding past. Damping comes from MountedCamera so the toy's body
 * roll never makes the image chatter.
 */
import { MountedCamera } from './MountedCamera.js';

export class WheelCamera extends MountedCamera {}
