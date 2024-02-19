import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Categories, CharacteristicValue, CharacteristicSetCallback,
  CharacteristicChange, CharacteristicGetCallback, HAPStatus } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { Action, Client, Command, Device, Execution } from 'overkiz-client';
import { hostname } from 'os';
import { HoldPosition, MoveToPosition, TaHomaCharacteristic, addCharacteristic, createServiceAccessoryInformation, createServiceWindowCovering} from './hapCustom.js';
import { NodeStorageManager } from 'node-storage-manager';
import { CLogger, TimestampFormat } from 'node-color-logger';
import path from 'path';

// npm link --save node-storage-manager
// npm link --save node-color-logger

export class SomfyTaHomaBridgePlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];

  // CLogger
  public log: CLogger;

  // NodeStorageManager
  nodeStorageManager: NodeStorageManager;

  // TaHoma
  tahomaClient: Client;

  constructor(
    public readonly hbLog: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {

    this.log = new CLogger({ logName: 'Somfy TaHoma Screen', logTimestampFormat: TimestampFormat.TIME_MILLIS });
    this.log.debug('Finished initializing platform:', this.config.name);

    // create NodeStorageManager
    this.nodeStorageManager = new NodeStorageManager({dir: path.join(this.api.user.storagePath(), 'homebridge-somfy-tahoma-screen'), logging: false});

    // create TaHoma client
    this.tahomaClient = new Client(this.log, { service: this.config.service, user: this.config.username, password: this.config.password });

    this.tahomaClient.on('connect', () => {
      this.log.info('TaHoma service connected');
    });

    this.tahomaClient.on('disconnect', () => {
      this.log.warn('TaHoma service disconnected');
    });

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');

      //this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.accessories);
      setTimeout( async () => {
        //this.accessories.splice(0);
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
    await this.tahomaClient.connect(this.config.username, this.config.password);
    const devices = await this.tahomaClient.getDevices();
    this.log.info('TaHoma', devices.length, 'devices discovered');

    for (const device of devices) {
      this.log.debug(`Device: ${device.label} uiClass ${device.definition.uiClass} serial ${device.serialNumber}`);
      this.log.debug(`Commands for ${device.deviceURL}:`, JSON.stringify(device.commands));
      if (device.uniqueName === 'Blind') {
        blindDevices.push(device);
      }
    }
    this.log.info('TaHoma', blindDevices.length, 'screens discovered');
    for (const device of blindDevices) {
      this.log.debug(`Adding device: ${device.label} uiClass ${device.definition.uiClass} serial ${device.serialNumber}`);
      const uuid = this.api.hap.uuid.generate(device.serialNumber+hostname);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

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

  async setupAccessory(platformAccessory: PlatformAccessory, device: Device) {
    const Service = this.api.hap.Service;
    const Characteristic = this.api.hap.Characteristic;
    const accessory = platformAccessory._associatedHAPAccessory;

    const deviceStorage = await this.nodeStorageManager.createStorage(device.label);
    let windowCoveringCurrentPosition = await deviceStorage.get<number>('currentPosition', 100);
    let windowCoveringTargetPosition = await deviceStorage.get<number>('currentPosition', 100);
    createServiceAccessoryInformation(accessory, device.label,
      { manufacturer: 'Somfy-TaHoma', model: device.definition.uiClass, serialNumber: device.serialNumber+hostname });
    createServiceWindowCovering(accessory, device.label, {
      currentPosition: windowCoveringCurrentPosition, targetPosition: windowCoveringTargetPosition, positionState: Characteristic.PositionState.STOPPED,
      obstructionDetected: false, holdPosition: false, statusActive: true, statusFault: Characteristic.StatusFault.NO_FAULT, primary: true, nodeStorage: deviceStorage,
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
        this.log.debug('onSetTargetPosition', device.label, windowCoveringTargetPosition = value as number);
        MoveToPosition(accessory.getService(Service.WindowCovering)!, windowCoveringTargetPosition, await deviceStorage.get<number>('TaHomaDuration', 26),
          (command) => this.sendCommand(command, device, true));
        callback(HAPStatus.SUCCESS);
      },
      onSetHoldPosition: (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.log.debug('onSetHoldPosition', device.label);
        windowCoveringCurrentPosition = accessory.getService(Service.WindowCovering)!.getCharacteristic(Characteristic.CurrentPosition).value as number;
        HoldPosition(accessory.getService(Service.WindowCovering)!, windowCoveringCurrentPosition, (command) => this.sendCommand(command, device, true));
        callback(HAPStatus.SUCCESS);
      },
    });
    addCharacteristic(accessory, Service.WindowCovering, TaHomaCharacteristic.TaHomaUpButton, {
      value: false, onSet: (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        if (value === true) {
          accessory.getService(Service.WindowCovering)?.setCharacteristic(Characteristic.TargetPosition, 100);
          accessory.getService(Service.WindowCovering)?.setCharacteristic(TaHomaCharacteristic.TaHomaUpButton, false);
        }
      },
    });
    addCharacteristic(accessory, Service.WindowCovering, TaHomaCharacteristic.TaHomaMyButton, {
      value: false, onSet: (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        if (value === true) {
          accessory.getService(Service.WindowCovering)?.setCharacteristic(Characteristic.TargetPosition, 50);
          accessory.getService(Service.WindowCovering)?.setCharacteristic(TaHomaCharacteristic.TaHomaMyButton, false);
        }
      },
    });
    addCharacteristic(accessory, Service.WindowCovering, TaHomaCharacteristic.TaHomaDownButton, {
      value: false, onSet: (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        if (value === true) {
          accessory.getService(Service.WindowCovering)?.setCharacteristic(Characteristic.TargetPosition, 0);
          accessory.getService(Service.WindowCovering)?.setCharacteristic(TaHomaCharacteristic.TaHomaDownButton, false);
        }
      },
    });
    addCharacteristic(accessory, Service.WindowCovering, TaHomaCharacteristic.TaHomaMyDuration, {
      nodeStorage: deviceStorage, storageKey: 'TaHomaMyDuration', storageDefaultValue: 12,
      onSet: async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        await deviceStorage.set<number>('TaHomaMyDuration', value as number);
      },
    });
    addCharacteristic(accessory, Service.WindowCovering, TaHomaCharacteristic.TaHomaDuration, {
      nodeStorage: deviceStorage, storageKey: 'TaHomaDuration', storageDefaultValue: 26,
      onSet: async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        callback(HAPStatus.SUCCESS);
        await deviceStorage.set<number>('TaHomaDuration', value as number);
      },
    });

    //const windowCoveringHistory = new HapHistory(log, accessory, { enableAutopilot: true, enableConfigData: true, filePath: './persist' });
  }

  sendCommand(command: string, device: Device, highPriority = false) {
    this.log.debug(`*Sending command ${command} highPriority ${highPriority}`);
    const _command = new Command(command);
    const _action = new Action(device.deviceURL, [_command]);
    const _execution = new Execution('Sending ' + command, _action);
    this.tahomaClient.execute(highPriority ? 'apply/highPriority' : 'apply', _execution);
  }

}
