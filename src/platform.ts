/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Categories,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicChange,
  CharacteristicGetCallback,
  HAPStatus,
  Formats,
  Perms,
  Units,
} from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { Action, Client, Command, Device, Execution } from 'overkiz-client';
import { hostname } from 'os';
import { CharacteristicDefinition, HoldPosition, MoveToPosition, addCharacteristic, createServiceAccessoryInformation, createServiceWindowCovering } from './hapCustom.js';
import { NodeStorageManager } from 'node-persist-manager';
import { AnsiLogger, LogLevel, TimestampFormat } from 'node-ansi-logger';
import path from 'path';

export class SomfyTaHomaBridgePlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];

  // Logger
  log: AnsiLogger;

  // NodeStorageManager
  nodeStorageManager: NodeStorageManager;

  // TaHoma
  tahomaClient?: Client;

  constructor(
    public readonly hbLog: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    // create AnsiLogger
    this.log = new AnsiLogger({
      logName: 'Somfy TaHoma Screen',
      logTimestampFormat: TimestampFormat.TIME_MILLIS,
      logLevel: this.config.debug === true ? LogLevel.DEBUG : LogLevel.INFO,
    });

    // create NodeStorageManager
    this.nodeStorageManager = new NodeStorageManager({
      dir: path.join(this.api.user.storagePath(), 'homebridge-somfy-tahoma-screen'),
      logging: false,
    });

    if (!this.config.service || !this.config.username || !this.config.password) {
      this.log.error('No service or username or password provided for:', this.config.name);
      return;
    }
    this.log.info('Finished initializing platform:', this.config.name);

    // create TaHoma client
    this.tahomaClient = new Client(this.log, {
      service: this.config.service,
      user: this.config.username,
      password: this.config.password,
    });

    this.tahomaClient.on('connect', () => {
      this.log.info('TaHoma service connected');
    });

    this.tahomaClient.on('disconnect', () => {
      this.log.warn('TaHoma service disconnected');
    });

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');

      // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);
      setTimeout(async () => {
        // this.accessories.splice(0);
        await this.discoverDevices();
      }, 1000);
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  async discoverDevices() {
    const blindDevices: Device[] = [];

    // TaHoma
    if (!this.tahomaClient) {
      return;
    }
    let devices: Device[] = [];
    try {
      await this.tahomaClient.connect(this.config.username, this.config.password);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.log.info('Error connecting to TaHoma service:', error.response?.data);
      return;
    }
    try {
      devices = await this.tahomaClient.getDevices();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.log.info('Error discovering TaHoma devices:', error.response?.data);
      return;
    }

    this.log.info('TaHoma', devices.length, 'devices discovered');

    for (const device of devices) {
      this.log.debug(`Device: ${device.label}`);
      this.log.debug(`- uniqueName ${device.uniqueName}`);
      this.log.debug(`- uiClass ${device.definition.uiClass}`);
      this.log.debug(`- serial ${device.serialNumber}`);
      this.log.debug(`- deviceURL ${device.deviceURL}`);
      this.log.debug(`- commands: ${JSON.stringify(device.commands)}`);
      this.log.debug(`- states: ${JSON.stringify(device.states)}`);
      const supportedUniqueNames = [
        'Blind',
        'BlindRTSComponent',
        'ExteriorBlindRTSComponent',
        'ExteriorVenetianBlindRTSComponent',
        'Shutter',
        'RollerShutterRTSComponent',
        'HorizontalAwningRTSComponent',
        'PergolaHorizontalUnoIOComponent',
        'Awning',
      ];
      if (supportedUniqueNames.includes(device.uniqueName)) {
        blindDevices.push(device);
      }
    }
    this.log.info('TaHoma', blindDevices.length, 'screens discovered');
    for (const device of blindDevices) {
      this.log.debug(`Adding device: ${device.label} uniqueName ${device.uniqueName} uiClass ${device.definition.uiClass} serial ${device.serialNumber}`);
      const uuid = this.api.hap.uuid.generate(device.serialNumber + hostname);
      const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory:', existingAccessory.displayName);

        await this.setupAccessory(existingAccessory, device);
      } else {
        this.log.info('Adding new accessory:', device.label);

        const accessory = new this.api.platformAccessory(device.label, uuid, Categories.WINDOW_COVERING);

        await this.setupAccessory(accessory, device);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  // const api = typeof import('c:/Users/lligu/OneDrive/GitHub/homebridge-somfy-tahoma-screen/node_modules/hap-nodejs/dist/index');

  async setupAccessory(platformAccessory: PlatformAccessory, device: Device) {
    const Service = this.api.hap.Service;
    const Characteristic = this.api.hap.Characteristic;

    const TaHomaMyButton: CharacteristicDefinition = {
      UUID: '4F6B9801-0723-412F-8567-678605A29F52',
      props: {
        format: Formats.BOOL,
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
      },
      name: 'Remote [my]',
      value: false,
    };

    const TaHomaUpButton: CharacteristicDefinition = {
      UUID: '4F6B9802-0723-412F-8567-678605A29F52',
      props: {
        format: Formats.BOOL,
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
      },
      name: 'Remote [up]',
      value: false,
    };

    const TaHomaDownButton: CharacteristicDefinition = {
      UUID: '4F6B9803-0723-412F-8567-678605A29F52',
      props: {
        format: Formats.BOOL,
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
      },
      name: 'Remote [down]',
      value: false,
    };

    const TaHomaDuration: CharacteristicDefinition = {
      UUID: '4F6B9804-0723-412F-8567-678605A29F52',
      props: {
        format: Formats.UINT8,
        unit: Units.SECONDS,
        minValue: 1,
        maxValue: 60,
        minStep: 1,
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
      },
      name: 'Duration of movement',
      value: 26,
    };

    const TaHomaMyDuration: CharacteristicDefinition = {
      UUID: '4F6B9805-0723-412F-8567-678605A29F52',
      props: {
        format: Formats.UINT8,
        unit: Units.SECONDS,
        minValue: 1,
        maxValue: 60,
        minStep: 1,
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
      },
      name: 'Duration of [my] movement',
      value: 12,
    };

    const accessory = platformAccessory;

    const deviceStorage = await this.nodeStorageManager.createStorage(device.label);
    let windowCoveringCurrentPosition = await deviceStorage.get<number>('currentPosition', 100);
    let windowCoveringTargetPosition = await deviceStorage.get<number>('currentPosition', 100);
    createServiceAccessoryInformation(this.api, accessory, device.label, {
      manufacturer: 'Somfy-TaHoma',
      model: device.definition.uiClass,
      serialNumber: device.serialNumber + hostname,
    });
    createServiceWindowCovering(this.api, accessory, device.label, {
      currentPosition: windowCoveringCurrentPosition,
      targetPosition: windowCoveringTargetPosition,
      positionState: Characteristic.PositionState.STOPPED,
      obstructionDetected: false,
      holdPosition: false,
      statusActive: true,
      statusFault: Characteristic.StatusFault.NO_FAULT,
      primary: true,
      nodeStorage: deviceStorage,
      onChangeCurrentPosition: async (change: CharacteristicChange) => {
        windowCoveringCurrentPosition = change.newValue as number;
        await deviceStorage.set<number>('currentPosition', windowCoveringCurrentPosition);
        this.log.debug('onChangeCurrentPosition', device.label, change.reason, change.oldValue, change.newValue);
      },
      onGetCurrentPosition: (callback: CharacteristicGetCallback) => {
        this.log.debug('onGetCurrentPosition', device.label, windowCoveringCurrentPosition);
        callback(HAPStatus.SUCCESS, windowCoveringCurrentPosition);
      },
      onSetTargetPosition: async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.log.debug('onSetTargetPosition', device.label, (windowCoveringTargetPosition = value as number));
        try {
          MoveToPosition(
            this.api,
            accessory.getService(Service.WindowCovering)!,
            windowCoveringTargetPosition,
            await deviceStorage.get<number>('TaHomaDuration', 26),
            async (command) => await this.sendCommand(command, device, true),
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          this.log.error('Error setting target position');
        }
        callback(HAPStatus.SUCCESS);
      },
      onSetHoldPosition: (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.log.debug('onSetHoldPosition', device.label);
        windowCoveringCurrentPosition = accessory.getService(Service.WindowCovering)!.getCharacteristic(Characteristic.CurrentPosition).value as number;
        try {
          HoldPosition(this.api, accessory.getService(Service.WindowCovering)!, windowCoveringCurrentPosition, async (command) => await this.sendCommand(command, device, true));
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          this.log.error('Error setting hold position');
        }
        callback(HAPStatus.SUCCESS);
      },
    });
    addCharacteristic(this.api, accessory, Service.WindowCovering, TaHomaUpButton, {
      value: false,
      onSet: (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        if (value === true) {
          accessory.getService(Service.WindowCovering)?.setCharacteristic(Characteristic.TargetPosition, 100);
          accessory.getService(Service.WindowCovering)?.setCharacteristic('Remote [up]', false);
        }
      },
    });
    addCharacteristic(this.api, accessory, Service.WindowCovering, TaHomaMyButton, {
      value: false,
      onSet: (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        if (value === true) {
          accessory.getService(Service.WindowCovering)?.setCharacteristic(Characteristic.TargetPosition, 50);
          accessory.getService(Service.WindowCovering)?.setCharacteristic('Remote [my]', false);
        }
      },
    });
    addCharacteristic(this.api, accessory, Service.WindowCovering, TaHomaDownButton, {
      value: false,
      onSet: (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        if (value === true) {
          accessory.getService(Service.WindowCovering)?.setCharacteristic(Characteristic.TargetPosition, 0);
          accessory.getService(Service.WindowCovering)?.setCharacteristic('Remote [down]', false);
        }
      },
    });
    addCharacteristic(this.api, accessory, Service.WindowCovering, TaHomaMyDuration, {
      nodeStorage: deviceStorage,
      storageKey: 'TaHomaMyDuration',
      storageDefaultValue: 12,
      onSet: async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        await deviceStorage.set<number>('TaHomaMyDuration', value as number);
      },
    });
    addCharacteristic(this.api, accessory, Service.WindowCovering, TaHomaDuration, {
      nodeStorage: deviceStorage,
      storageKey: 'TaHomaDuration',
      storageDefaultValue: 26,
      onSet: async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        await deviceStorage.set<number>('TaHomaDuration', value as number);
      },
    });
    // logAccessory(accessory, this.log);

    // const windowCoveringHistory = new HapHistory(log, accessory, { enableAutopilot: true, enableConfigData: true, filePath: './persist' });
  }

  async sendCommand(command: string, device: Device, highPriority = false) {
    if (command === 'open' && !device.commands.includes('open') && device.commands.includes('rollUp')) command = 'rollUp';
    if (command === 'close' && !device.commands.includes('close') && device.commands.includes('rollOut')) command = 'rollOut';

    this.log.debug(`*Sending command ${command} highPriority ${highPriority} to ${device.label}`);
    try {
      const _command = new Command(command);
      const _action = new Action(device.deviceURL, [_command]);
      const _execution = new Execution('Sending ' + command, _action);
      await this.tahomaClient?.execute(highPriority ? 'apply/highPriority' : 'apply', _execution);
    } catch (error) {
      this.log.error(`Error sending command error: ${error instanceof Error ? error.message : error}`);
    }
  }
}
