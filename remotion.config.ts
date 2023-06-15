import {Config} from 'remotion';

Config.setConcurrency(8);
Config.setImageFormat('png');
Config.setPixelFormat('yuva444p10le');
Config.setCodec('h264');
Config.setMuted(true);
Config.setOverwriteOutput(true);