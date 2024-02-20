/**
 * This file contains the helpers for HAP-NodeJS and homebridge packages.
 *
 * @file hapCustom.ts
 * @author Luca Liguori
 * @date 2023-11-13
 * @version 1.0.7
 *
 * All rights reserved.
 *
 */

import {
  Accessory,
  Service,
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  CharacteristicContext,
  CharacteristicChange,
  CharacteristicWarningType,
  Formats,
  Perms,
  Units,
  HAPConnection,
  WithUUID,
  CharacteristicGetHandler,
  CharacteristicSetHandler,
  VoidCallback,
  Categories,
} from 'hap-nodejs';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { AnsiLogger, debugStringify, db, dn, er, hk, id, rk, rs, wr, zb } from 'node-ansi-logger';
import { NodeStorage, NodeStorageKey } from 'node-persist-manager';

export const HapCategoryNames: { [key: number]: string } = {
  [Categories.OTHER]: 'OTHER',
  [Categories.BRIDGE]: 'BRIDGE',
  [Categories.FAN]: 'FAN',
  [Categories.GARAGE_DOOR_OPENER]: 'GARAGE_DOOR_OPENER',
  [Categories.LIGHTBULB]: 'LIGHTBULB',
  [Categories.DOOR_LOCK]: 'DOOR_LOCK',
  [Categories.OUTLET]: 'OUTLET',
  [Categories.SWITCH]: 'SWITCH',
  [Categories.THERMOSTAT]: 'THERMOSTAT',
  [Categories.SENSOR]: 'SENSOR',
  [Categories.SECURITY_SYSTEM]: 'SECURITY_SYSTEM',
  [Categories.DOOR]: 'DOOR',
  [Categories.WINDOW]: 'WINDOW',
  [Categories.WINDOW_COVERING]: 'WINDOW_COVERING',
  [Categories.PROGRAMMABLE_SWITCH]: 'PROGRAMMABLE_SWITCH',
  [Categories.RANGE_EXTENDER]: 'RANGE_EXTENDER',
  [Categories.IP_CAMERA]: 'IP_CAMERA',
  [Categories.VIDEO_DOORBELL]: 'VIDEO_DOORBELL',
  [Categories.AIR_PURIFIER]: 'AIR_PURIFIER',
  [Categories.AIR_HEATER]: 'AIR_HEATER',
  [Categories.AIR_CONDITIONER]: 'AIR_CONDITIONER',
  [Categories.AIR_HUMIDIFIER]: 'AIR_HUMIDIFIER',
  [Categories.AIR_DEHUMIDIFIER]: 'AIR_DEHUMIDIFIER',
  [Categories.APPLE_TV]: 'APPLE_TV',
  [Categories.HOMEPOD]: 'HOMEPOD',
  [Categories.SPEAKER]: 'SPEAKER',
  [Categories.AIRPORT]: 'AIRPORT',
  [Categories.SPRINKLER]: 'SPRINKLER',
  [Categories.FAUCET]: 'FAUCET',
  [Categories.SHOWER_HEAD]: 'SHOWER_HEAD',
  [Categories.TELEVISION]: 'TELEVISION',
  [Categories.TARGET_CONTROLLER]: 'TARGET_CONTROLLER',
  [Categories.ROUTER]: 'ROUTER',
  [Categories.AUDIO_RECEIVER]: 'AUDIO_RECEIVER',
  [Categories.TV_SET_TOP_BOX]: 'TV_SET_TOP_BOX',
  [Categories.TV_STREAMING_STICK]: 'TV_STREAMING_STICK',
};

export type CharacteristicGetListener = (callback: CharacteristicGetCallback, context: CharacteristicContext, connection?: HAPConnection) => void;
export type CharacteristicSetListener = (value: CharacteristicValue, callback: CharacteristicSetCallback, context: CharacteristicContext, connection?: HAPConnection) => void;
export type CharacteristicChangeListener = (change: CharacteristicChange) => void;
export type CharacteristicSubscribeListener = VoidCallback;
export type CharacteristicUnsubscribeListener = VoidCallback;
export type CharacteristicWarningListener = (type: CharacteristicWarningType, message: string, stack?: string) => void;

export class EveService extends EventEmitter {
  public static AirPressureSensor: typeof AirPressureSensor;
}

export class AirPressureSensor extends Service {
  public static readonly UUID: string = 'E863F00A-079E-48FF-8F27-9C2605A29F52';
  constructor(displayName?: string, subtype?: string) {
    super(displayName, AirPressureSensor.UUID, subtype);
    this.addCharacteristic(EveCharacteristic.CurrentPressure);
    this.addOptionalCharacteristic(EveCharacteristic.Elevation);
    this.addOptionalCharacteristic(EveCharacteristic.WeatherTrend);
  }
}
EveService.AirPressureSensor = AirPressureSensor;

export class EveCharacteristic extends EventEmitter {
  public static CurrentPressure: typeof CurrentPressure;
  public static Elevation: typeof Elevation;
  public static WeatherTrend: typeof WeatherTrend;
  public static Sensitivity: typeof Sensitivity;
  public static Duration: typeof Duration;
  public static Voltage: typeof Voltage;
  public static Current: typeof Current;
  public static Power: typeof Power;
  public static Energy: typeof Energy;
  public static BatteryLevel: typeof BatteryLevel;
}

export class CurrentPressure extends Characteristic {
  public static readonly UUID: string = 'E863F10F-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Current Pressure', CurrentPressure.UUID, {
      format: Formats.FLOAT, unit: 'hPa', perms: [Perms.PAIRED_READ, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.CurrentPressure = CurrentPressure;

export class Elevation extends Characteristic {
  public static readonly UUID: string = 'E863F130-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Elevation', Elevation.UUID, {
      format: Formats.FLOAT, minValue: -500, maxValue: 9000, minStep: 1, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.Elevation = Elevation;

export class WeatherTrend extends Characteristic {
  public static readonly UUID: string = 'E863F136-079E-48FF-8F27-9C2605A29F52';
  // on Weather 1-9=Sun 3-4-11=CloudSun 5-6-7=Rain 12-13-14-15=RainWind 0-2-8-10=Empty
  public static readonly BLANK = 0;
  public static readonly SUN = 1;
  public static readonly CLOUDS_SUN = 3;
  public static readonly RAIN = 5;
  public static readonly RAIN_WIND = 12;
  constructor() {
    super('Weather Trend', WeatherTrend.UUID, {
      format: Formats.UINT8, minValue: 0, maxValue: 15, minStep: 1, perms: [Perms.PAIRED_READ, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.WeatherTrend = WeatherTrend;

export class Sensitivity extends Characteristic {
  public static readonly UUID: string = 'E863F120-079E-48FF-8F27-9C2605A29F52';
  public static readonly HIGH = 0;
  public static readonly MEDIUM = 4;
  public static readonly LOW = 7;
  constructor() {
    super('Sensitivity', Sensitivity.UUID, {
      format: Formats.UINT16, maxValue: 7, minValue: 0, minStep: 1, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.Sensitivity = Sensitivity;

export class Duration extends Characteristic {
  public static readonly UUID: string = 'E863F12D-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Duration', Duration.UUID, {
      format: Formats.UINT16, maxValue: 3600, minValue: 0, minStep: 1, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.Duration = Duration;

export class BatteryLevel extends Characteristic {
  public static readonly UUID: string = 'E863F11B-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('BatteryVoltage', BatteryLevel.UUID, {
      format: Formats.UINT16, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.BatteryLevel = BatteryLevel;

export class Voltage extends Characteristic {
  public static readonly UUID: string = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Voltage', Voltage.UUID, {
      format: Formats.FLOAT, unit: 'V', minValue: 0, maxValue: 1000000, minStep: 0.01, perms: [Perms.PAIRED_READ, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.Voltage = Voltage;

export class Current extends Characteristic {
  public static readonly UUID: string = 'E863F126-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Current', Current.UUID, {
      format: Formats.FLOAT, unit: 'A', minValue: 0, maxValue: 1000000, minStep: 0.01, perms: [Perms.PAIRED_READ, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.Current = Current;

export class Power extends Characteristic {
  public static readonly UUID: string = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Power', Power.UUID, {
      format: Formats.FLOAT, unit: 'W', minValue: 0, maxValue: 1000000, minStep: 0.01, perms: [Perms.PAIRED_READ, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.Power = Power;

export class Energy extends Characteristic {
  public static readonly UUID: string = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Energy', Energy.UUID, {
      format: Formats.FLOAT, unit: 'kWh', minValue: 0, maxValue: 1000000, minStep: 0.01, perms: [Perms.PAIRED_READ, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
EveCharacteristic.Energy = Energy;

export class TaHomaCharacteristic extends EventEmitter {
  public static TaHomaMyButton: typeof TaHomaMyButton;
  public static TaHomaUpButton: typeof TaHomaUpButton;
  public static TaHomaDownButton: typeof TaHomaDownButton;
  public static TaHomaDuration: typeof TaHomaDuration;
  public static TaHomaMyDuration: typeof TaHomaMyDuration;
}

export class TaHomaMyButton extends Characteristic {
  public static readonly UUID: string = '4F6B9801-0723-412F-8567-678605A29F52';
  constructor() {
    super('Remote [my]', TaHomaMyButton.UUID, {
      format: Formats.BOOL, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
TaHomaCharacteristic.TaHomaMyButton = TaHomaMyButton;

export class TaHomaUpButton extends Characteristic {
  public static readonly UUID: string = '4F6B9802-0723-412F-8567-678605A29F52';
  constructor() {
    super('Remote [up]', TaHomaUpButton.UUID, {
      format: Formats.BOOL, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
TaHomaCharacteristic.TaHomaUpButton = TaHomaUpButton;

export class TaHomaDownButton extends Characteristic {
  public static readonly UUID: string = '4F6B9803-0723-412F-8567-678605A29F52';
  constructor() {
    super('Remote [down]', TaHomaDownButton.UUID, {
      format: Formats.BOOL, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
TaHomaCharacteristic.TaHomaDownButton = TaHomaDownButton;

export class TaHomaDuration extends Characteristic {
  public static readonly UUID: string = '4F6B9804-0723-412F-8567-678605A29F52';
  constructor() {
    super('Duration of movement', TaHomaDuration.UUID, {
      format: Formats.UINT8, unit: Units.SECONDS, minValue: 1, maxValue: 60, minStep: 1, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
TaHomaCharacteristic.TaHomaDuration = TaHomaDuration;

export class TaHomaMyDuration extends Characteristic {
  public static readonly UUID: string = '4F6B9805-0723-412F-8567-678605A29F52';
  constructor() {
    super('Duration of [my] movement', TaHomaMyDuration.UUID, {
      format: Formats.UINT8, unit: Units.SECONDS, minValue: 1, maxValue: 60, minStep: 1, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS],
    });
    this.value = this.getDefaultValue();
  }
}
TaHomaCharacteristic.TaHomaMyDuration = TaHomaMyDuration;

export interface AccessoryInformationParams extends BaseServiceParams {
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  firmwareRevision?: string; // boolean
  hardwareRevision?: string; // boolean write
  softwareRevision?: string; // boolean write
  onSetIdentify?: CharacteristicSetListener;
  onSetIdentifyAsync?: CharacteristicSetHandler;
}

export const createServiceAccessoryInformation = (accessory: Accessory, displayName: string, optionalParams?: AccessoryInformationParams) => {
  const params: AccessoryInformationParams = Object.assign({
    model: 'Hap Model',
    manufacturer: 'Hap Manufacturer',
    serialNumber: crypto.randomBytes(8).toString('hex'),
    firmwareRevision: '1.0.0',
    hardwareRevision: undefined, //'1.0.0',
    softwareRevision: undefined, //'1.0.0',
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    onSetIdentify: undefined,
    onSetIdentifyAsync: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.AccessoryInformation) || accessory.addService(new Service.AccessoryInformation(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.Model, params.model!);
  service.setCharacteristic(Characteristic.Manufacturer, params.manufacturer!);
  service.setCharacteristic(Characteristic.SerialNumber, params.serialNumber!);
  if (params.firmwareRevision) {
    service.setCharacteristic(Characteristic.FirmwareRevision, params.firmwareRevision);
  }
  if (params.hardwareRevision) {
    service.setCharacteristic(Characteristic.HardwareRevision, params.hardwareRevision);
  }
  if (params.softwareRevision) {
    service.setCharacteristic(Characteristic.SoftwareRevision, params.softwareRevision);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.onSetIdentify) {
    service.getCharacteristic(Characteristic.Identify).on(CharacteristicEventTypes.SET, params.onSetIdentify);
  } else if (params.onSetIdentifyAsync) {
    service.getCharacteristic(Characteristic.Identify).onSet(params.onSetIdentifyAsync);
  }
  return service;
};

export const createServiceSwitch = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    on: false,
    lockPhysicalControls: undefined, // boolean
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hiddenOn: undefined,
    descriptionOn: undefined,
    primary: undefined,
    hidden: undefined,
    getter: undefined,
    setter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.Switch) || accessory.addService(new Service.Switch(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.On, params.on);
  if (params.lockPhysicalControls !== undefined) {
    service.setCharacteristic(Characteristic.LockPhysicalControls, params.lockPhysicalControls);
  }
  if (params.descriptionOn) {
    service.getCharacteristic(Characteristic.On).setProps({ description: params.descriptionOn });
  }
  if (params.hiddenOn) {
    service.getCharacteristic(Characteristic.On).setProps(
      params.descriptionOn ?
        { description: params.descriptionOn, perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS, Perms.HIDDEN] } :
        { perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS, Perms.HIDDEN] });
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.On).on(CharacteristicEventTypes.GET, params.getter);
  }
  if (params.setter) {
    service.getCharacteristic(Characteristic.On).on(CharacteristicEventTypes.SET, params.setter);
  }
  return service;
};

export const createServiceOutlet = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    on: false,
    outletInUse: undefined, // boolean
    lockPhysicalControls: undefined, // boolean
    voltage: undefined,
    current: undefined,
    power: undefined,
    energy: undefined,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
    setter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.Outlet) || accessory.addService(new Service.Outlet(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.On, params.on);
  if (params.outletInUse !== undefined) {
    service.setCharacteristic(Characteristic.OutletInUse, params.outletInUse);
  }
  if (params.lockPhysicalControls !== undefined) {
    service.setCharacteristic(Characteristic.LockPhysicalControls, params.lockPhysicalControls);
  }
  if (params.voltage !== undefined) {
    service.addOptionalCharacteristic(EveCharacteristic.Voltage);
    service.setCharacteristic(EveCharacteristic.Voltage, params.voltage);
  }
  if (params.current !== undefined) {
    service.addOptionalCharacteristic(EveCharacteristic.Current);
    service.setCharacteristic(EveCharacteristic.Current, params.current);
  }
  if (params.power !== undefined) {
    service.addOptionalCharacteristic(EveCharacteristic.Power);
    service.setCharacteristic(EveCharacteristic.Power, params.power);
  }
  if (params.energy !== undefined) {
    service.addOptionalCharacteristic(EveCharacteristic.Energy);
    service.setCharacteristic(EveCharacteristic.Energy, params.energy);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.On).on(CharacteristicEventTypes.GET, params.getter);
  }
  if (params.setter) {
    service.getCharacteristic(Characteristic.On).on(CharacteristicEventTypes.SET, params.setter);
  }
  return service;
};

export const createServiceLightbulb = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    on: false,
    brightness: undefined,
    colorTemperature: undefined,
    hue: undefined,
    saturation: undefined,
    lockPhysicalControls: undefined, // boolean
    characteristicValueActiveTransitionCount: undefined,
    characteristicValueTransitionControl: undefined,
    supportedCharacteristicValueTransitionConfiguration: undefined,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
    setter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.Lightbulb) || accessory.addService(new Service.Lightbulb(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.On, params.on);
  if (params.brightness !== undefined) {
    service.setCharacteristic(Characteristic.Brightness, params.brightness);
  }
  if (params.colorTemperature !== undefined) {
    service.setCharacteristic(Characteristic.ColorTemperature, params.colorTemperature);
  }
  if (params.hue !== undefined) {
    service.setCharacteristic(Characteristic.Hue, params.hue);
  }
  if (params.saturation !== undefined) {
    service.setCharacteristic(Characteristic.Saturation, params.saturation);
  }
  if (params.lockPhysicalControls !== undefined) {
    service.setCharacteristic(Characteristic.LockPhysicalControls, params.lockPhysicalControls);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.On).on(CharacteristicEventTypes.GET, params.getter);
  }
  if (params.setter) {
    service.getCharacteristic(Characteristic.On).on(CharacteristicEventTypes.SET, params.setter);
  }
  return service;
};

export function MoveToPosition(service: Service, targetPosition: number, durationSeconds: number, executeCommand?: (command: string) => void) {
  let currentPosition = service.getCharacteristic(Characteristic.CurrentPosition).value as number;
  const positionState = service.getCharacteristic(Characteristic.PositionState).value;
  if (positionState !== Characteristic.PositionState.STOPPED) {
    // eslint-disable-next-line no-console
    console.log('Already moving so stop it and return');
    HoldPosition(service, currentPosition);
    executeCommand?.('stop');
    return;
  }

  if (targetPosition > currentPosition) { // Opening
    const steps = targetPosition - currentPosition;
    const duration = steps * durationSeconds / 100;
    // eslint-disable-next-line no-console
    console.log('Opening current', currentPosition, 'target', targetPosition, 'duration', duration, 'steps', steps);
    service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.INCREASING);
    executeCommand?.('open');
    const timeout = setInterval(() => {
      if (service.getCharacteristic(Characteristic.PositionState).value === Characteristic.PositionState.STOPPED) {
        clearInterval(timeout);
        return;
      }
      currentPosition += 1;
      if (currentPosition >= targetPosition) {
        currentPosition = targetPosition;
        service.setCharacteristic(Characteristic.CurrentPosition, currentPosition);
        service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
        clearInterval(timeout);
        if (currentPosition !== 100) {
          executeCommand?.('stop');
        }
      } else {
        service.setCharacteristic(Characteristic.CurrentPosition, currentPosition);
      }
    }, duration / steps * 1000);
  }

  if (targetPosition < currentPosition) { // Closing
    const steps = currentPosition - targetPosition;
    const duration = steps * durationSeconds / 100;
    // eslint-disable-next-line no-console
    console.log('Closing current', currentPosition, 'target', targetPosition, 'duration', duration, 'steps', steps);
    service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.DECREASING);
    executeCommand?.('close');
    const timeout = setInterval(() => {
      if (service.getCharacteristic(Characteristic.PositionState).value === Characteristic.PositionState.STOPPED) {
        clearInterval(timeout);
        return;
      }
      currentPosition -= 1;
      if (currentPosition <= targetPosition) {
        currentPosition = targetPosition;
        service.setCharacteristic(Characteristic.CurrentPosition, currentPosition);
        service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
        clearInterval(timeout);
        if (currentPosition !== 0) {
          executeCommand?.('stop');
        }
      } else {
        service.setCharacteristic(Characteristic.CurrentPosition, currentPosition);
      }
    }, duration / steps * 1000);
  }
}

export function HoldPosition(service: Service, currentPosition: number, executeCommand?: (command: string) => void) {
  // eslint-disable-next-line no-console
  console.log('HoldPosition currentPosition', currentPosition);
  service.updateCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
  service.updateCharacteristic(Characteristic.CurrentPosition, currentPosition);
  service.updateCharacteristic(Characteristic.TargetPosition, currentPosition);
  executeCommand?.('stop');
}

export const createServiceDoor = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    currentPosition: 0,
    targetPosition: 0,
    positionState: Characteristic.PositionState.STOPPED, // read
    obstructionDetected: undefined, // boolean
    holdPosition: undefined, // boolean write
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    onChange: undefined,
    getter: undefined,
    setter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.Door) || accessory.addService(new Service.Door(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.CurrentPosition, params.currentPosition);
  service.setCharacteristic(Characteristic.TargetPosition, params.targetPosition);
  service.setCharacteristic(Characteristic.PositionState, params.positionState);
  if (params.obstructionDetected !== undefined) {
    service.setCharacteristic(Characteristic.ObstructionDetected, params.obstructionDetected);
  }
  if (params.holdPosition !== undefined) {
    service.setCharacteristic(Characteristic.HoldPosition, params.holdPosition);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.onChange) {
    service.getCharacteristic(Characteristic.CurrentPosition).on(CharacteristicEventTypes.CHANGE, params.onChange);
  }
  if (params.getter) {
    service.getCharacteristic(Characteristic.CurrentPosition).on(CharacteristicEventTypes.GET, params.getter);
  }
  if (params.setter) {
    service.getCharacteristic(Characteristic.TargetPosition).on(CharacteristicEventTypes.SET, params.setter);
  }
  return service;
};

export const createServiceWindow = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    currentPosition: 0,
    targetPosition: 0,
    positionState: Characteristic.PositionState.STOPPED, // read
    obstructionDetected: undefined, // boolean
    holdPosition: undefined, // boolean write
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    onChange: undefined,
    getter: undefined,
    setter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.Window) || accessory.addService(new Service.Window(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.CurrentPosition, params.currentPosition);
  service.setCharacteristic(Characteristic.TargetPosition, params.targetPosition);
  service.setCharacteristic(Characteristic.PositionState, params.positionState);
  if (params.obstructionDetected !== undefined) {
    service.setCharacteristic(Characteristic.ObstructionDetected, params.obstructionDetected);
  }
  if (params.holdPosition !== undefined) {
    service.setCharacteristic(Characteristic.HoldPosition, params.holdPosition);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.onChange) {
    service.getCharacteristic(Characteristic.CurrentPosition).on(CharacteristicEventTypes.CHANGE, params.onChange);
  }
  if (params.getter) {
    service.getCharacteristic(Characteristic.CurrentPosition).on(CharacteristicEventTypes.GET, params.getter);
  }
  if (params.setter) {
    service.getCharacteristic(Characteristic.TargetPosition).on(CharacteristicEventTypes.SET, params.setter);
  }
  return service;
};

export interface BaseServiceParams {
  statusActive?: boolean; //true,
  statusFault?: number; //Characteristic.StatusFault.NO_FAULT,
  hidden?: boolean;
  primary?: boolean;
  nodeStorage?: NodeStorage;
}

export interface WindowCoveringParams extends BaseServiceParams {
  currentPosition: number;
  targetPosition: number;
  positionState: number;
  obstructionDetected?: boolean; // boolean
  holdPosition?: boolean; // boolean write
  onChangeCurrentPosition?: CharacteristicChangeListener;
  onGetCurrentPosition?: CharacteristicGetListener;
  onSetTargetPosition?: CharacteristicSetListener;
  onSetHoldPosition?: CharacteristicSetListener;
}

export const createServiceWindowCovering = async (accessory: Accessory, displayName: string, optionalParams?: WindowCoveringParams) => {
  const params: WindowCoveringParams = Object.assign({
    currentPosition: 0,
    targetPosition: 0,
    positionState: Characteristic.PositionState.STOPPED, // read
    obstructionDetected: undefined, // boolean
    holdPosition: undefined, // boolean write
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    onChangeCurrentPosition: undefined,
    onGetCurrentPosition: undefined,
    onSetTargetPosition: undefined,
    onSetHoldPosition: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.WindowCovering) || accessory.addService(new Service.WindowCovering(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.CurrentPosition,
    params.nodeStorage ? await params.nodeStorage.get<number>('currentPosition', params.currentPosition) : params.currentPosition);
  service.setCharacteristic(Characteristic.TargetPosition,
    params.nodeStorage ? await params.nodeStorage.get<number>('targetPosition', params.targetPosition) : params.targetPosition);
  service.setCharacteristic(Characteristic.PositionState,
    params.nodeStorage ? await params.nodeStorage.get<number>('positionState', params.positionState) : params.positionState);
  if (params.obstructionDetected !== undefined) {
    service.setCharacteristic(Characteristic.ObstructionDetected,
      params.nodeStorage ? await params.nodeStorage.get<boolean>('obstructionDetected', params.obstructionDetected) : params.obstructionDetected);
  }
  if (params.holdPosition !== undefined) {
    service.setCharacteristic(Characteristic.HoldPosition,
      params.nodeStorage ? await params.nodeStorage.get<boolean>('holdPosition', params.holdPosition) : params.holdPosition);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.onChangeCurrentPosition) {
    service.getCharacteristic(Characteristic.CurrentPosition).on(CharacteristicEventTypes.CHANGE, params.onChangeCurrentPosition);
  }
  if (params.onGetCurrentPosition) {
    service.getCharacteristic(Characteristic.CurrentPosition).on(CharacteristicEventTypes.GET, params.onGetCurrentPosition);
  }
  if (params.onSetTargetPosition) {
    service.getCharacteristic(Characteristic.TargetPosition).on(CharacteristicEventTypes.SET, params.onSetTargetPosition);
  }
  if (params.onSetHoldPosition) {
    service.getCharacteristic(Characteristic.HoldPosition).on(CharacteristicEventTypes.SET, params.onSetHoldPosition);
  }
  return service;
};

export interface LockMechanismParams {
  lockCurrentState: number;
  lockTargetState: number;
  statusActive?: boolean; //true,
  statusFault?: number; //Characteristic.StatusFault.NO_FAULT,
  hidden?: boolean;
  primary?: boolean;
  onChangeLockCurrentState?: CharacteristicChangeListener;
  onGetLockCurrentState?: CharacteristicGetListener;
  onSetLockTargetState?: CharacteristicSetListener;
}

export const createServiceLockMechanism = (accessory: Accessory, displayName: string, optionalParams?: LockMechanismParams) => {
  const params: LockMechanismParams = Object.assign({
    lockCurrentState: Characteristic.LockCurrentState.UNSECURED,
    lockTargetState: Characteristic.LockCurrentState.UNSECURED,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    onChangeLockCurrentState: undefined,
    onGetLockCurrentState: undefined,
    onSetLockTargetState: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.LockMechanism) || accessory.addService(new Service.LockMechanism(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.LockCurrentState, params.lockCurrentState);
  service.setCharacteristic(Characteristic.LockTargetState, params.lockTargetState);
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.onChangeLockCurrentState) {
    service.getCharacteristic(Characteristic.LockCurrentState).on(CharacteristicEventTypes.CHANGE, params.onChangeLockCurrentState);
  }
  if (params.onGetLockCurrentState) {
    service.getCharacteristic(Characteristic.LockCurrentState).on(CharacteristicEventTypes.GET, params.onGetLockCurrentState);
  }
  if (params.onSetLockTargetState) {
    service.getCharacteristic(Characteristic.LockTargetState).on(CharacteristicEventTypes.SET, params.onSetLockTargetState);
  }
  return service;
};

export const createServiceStatelessProgrammableSwitch = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    programmableSwitchEvent: 0,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.StatelessProgrammableSwitch) || accessory.addService(new Service.StatelessProgrammableSwitch(displayName));
  setName(service, displayName);
  //service.setCharacteristic(Characteristic.StatelessProgrammableSwitch, params.programmableSwitchEvent); // We cannot set this one!
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.ProgrammableSwitchEvent).on(CharacteristicEventTypes.GET, params.getter);
  }
  return service;
};

export const createServiceContactSensor = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    contactSensorState: Characteristic.ContactSensorState.CONTACT_DETECTED, // 0 contact 1 no_contact
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.ContactSensor) || accessory.addService(new Service.ContactSensor(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.ContactSensorState, params.contactSensorState);
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.ContactSensorState).on(CharacteristicEventTypes.GET, params.getter);
  }
  return service;
};

export const createServiceTemperatureSensor = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    currentTemperature: 0,
    temperatureDisplayUnits: undefined,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.TemperatureSensor) || accessory.addService(new Service.TemperatureSensor(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.CurrentTemperature, params.currentTemperature);
  if (params.temperatureDisplayUnits !== undefined) {
    service.addOptionalCharacteristic(Characteristic.TemperatureDisplayUnits);
    service.setCharacteristic(Characteristic.TemperatureDisplayUnits, params.temperatureDisplayUnits);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.CurrentTemperature).on(CharacteristicEventTypes.GET, params.getter);
  }
  return service;
};

export const createServiceHumiditySensor = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    currentRelativeHumidity: 0,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.HumiditySensor) || accessory.addService(new Service.HumiditySensor(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.CurrentRelativeHumidity, params.currentRelativeHumidity);
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on(CharacteristicEventTypes.GET, params.getter);
  }
  return service;
};

export const createServicePressureSensor = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    currentPressure: 700,
    elevation: undefined,
    weatherTrend: undefined,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
  }, optionalParams);
  const service = accessory.getService(EveService.AirPressureSensor) || accessory.addService(new EveService.AirPressureSensor(displayName));
  setName(service, displayName);
  service.setCharacteristic(EveCharacteristic.CurrentPressure, params.currentPressure);
  if (params.elevation !== undefined) {
    service.setCharacteristic(EveCharacteristic.Elevation, params.elevation);
  }
  if (params.weatherTrend !== undefined) {
    service.setCharacteristic(EveCharacteristic.WeatherTrend, params.weatherTrend);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(EveCharacteristic.CurrentPressure).on(CharacteristicEventTypes.GET, params.getter);
  }
  return service;
};

export const createServiceMotionSensor = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    motionDetected: false,
    sensitivity: undefined,
    duration: undefined,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.MotionSensor) || accessory.addService(new Service.MotionSensor(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.MotionDetected, params.motionDetected);
  if (params.sensitivity !== undefined) {
    service.addOptionalCharacteristic(EveCharacteristic.Sensitivity);
    service.setCharacteristic(EveCharacteristic.Sensitivity, params.sensitivity);
  }
  if (params.duration !== undefined) {
    service.addOptionalCharacteristic(EveCharacteristic.Duration);
    service.setCharacteristic(EveCharacteristic.Duration, params.duration);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.MotionDetected).on(CharacteristicEventTypes.GET, params.getter);
  }
  return service;
};

export const createServiceLightSensor = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    currentAmbientLightLevel: 0,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.LightSensor) || accessory.addService(new Service.LightSensor(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.CurrentAmbientLightLevel, params.currentAmbientLightLevel);
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).on(CharacteristicEventTypes.GET, params.getter);
  }
  return service;
};

export const createServiceAirQualitySensor = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    airQuality: Characteristic.AirQuality.UNKNOWN,
    vocDensity: undefined,
    pm10Density: undefined,
    pm2_5Density: undefined,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
    getter: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.AirQualitySensor) || accessory.addService(new Service.AirQualitySensor(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.AirQuality, params.airQuality);
  if (params.vocDensity !== undefined) {
    service.setCharacteristic(Characteristic.VOCDensity, params.vocDensity);
  }
  if (params.pm10Density !== undefined) {
    service.setCharacteristic(Characteristic.PM10Density, params.pm10Density);
  }
  if (params.pm2_5Density !== undefined) {
    service.setCharacteristic(Characteristic.PM2_5Density, params.pm2_5Density);
  }
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  if (params.getter) {
    service.getCharacteristic(Characteristic.AirQuality).on(CharacteristicEventTypes.GET, params.getter);
  }
  return service;
};

export const createServiceBattery = (accessory: Accessory, displayName: string, optionalParams?: object) => {
  const params = Object.assign({
    statusLowBattery: Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
    batteryLevel: 100,
    chargingState: Characteristic.ChargingState.NOT_CHARGEABLE,
    statusActive: undefined, //true,
    statusFault: undefined, //Characteristic.StatusFault.NO_FAULT,
    hidden: undefined,
    primary: undefined,
  }, optionalParams);
  const service = accessory.getService(Service.Battery) || accessory.addService(new Service.Battery(displayName));
  setName(service, displayName);
  service.setCharacteristic(Characteristic.StatusLowBattery, params.statusLowBattery);
  service.setCharacteristic(Characteristic.BatteryLevel, params.batteryLevel);
  service.setCharacteristic(Characteristic.ChargingState, params.chargingState);
  setActiveFault(service, params.statusActive, params.statusFault);
  setPrimaryHidden(service, params.primary, params.hidden);
  return service;
};

export interface AddCharacteristicParams {
  value?: CharacteristicValue;
  hidden?: boolean;
  nodeStorage?: NodeStorage;
  storageKey?: NodeStorageKey;
  storageDefaultValue?: CharacteristicValue;
  onChange?: CharacteristicChangeListener;
  onGet?: CharacteristicGetListener;
  onGetAsync?: CharacteristicGetHandler;
  onSet?: CharacteristicSetListener;
  onSetAsync?: CharacteristicSetHandler;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function addCharacteristic<S extends WithUUID<typeof Service>>(accessory: Accessory, service: string | S, characteristic: { new(...args: any[]): Characteristic },
  params: AddCharacteristicParams) {
  //export type WithUUID<T> = T & { UUID: string };
  const _service = accessory.getService(service);
  if (!_service) {
    return;
  }
  let _characteristic = new characteristic();
  let isOptional = false;
  _service.optionalCharacteristics.forEach(optionalCharacteristic => {
    if (optionalCharacteristic.UUID === _characteristic.UUID) {
      isOptional = true;
      return;
    }
  });
  if (!isOptional) {
    _service.addOptionalCharacteristic(_characteristic);
  }
  let isPresent = false;
  _service.characteristics.forEach(characteristic => {
    if (characteristic.UUID === _characteristic.UUID) {
      _characteristic = characteristic;
      isPresent = true;
      return;
    }
  });
  if (!isPresent) {
    _characteristic = _service.addCharacteristic(_characteristic);
  }
  if (params.value) {
    _characteristic.setValue(params.value);
  } else if (params.nodeStorage && params.storageKey) {
    _characteristic.setValue(await params.nodeStorage.get(params.storageKey, params.storageDefaultValue));

  }
  if (params.onChange) {
    _characteristic.on(CharacteristicEventTypes.CHANGE, params.onChange);
  }
  if (params.onGet) {
    _characteristic.on(CharacteristicEventTypes.GET, params.onGet);
  } else if (params.onGetAsync) {
    _characteristic.onGet(params.onGetAsync);
  }
  if (params.onSet) {
    _characteristic.on(CharacteristicEventTypes.SET, params.onSet);
  } else if (params.onSetAsync) {
    _characteristic.onSet(params.onSetAsync);
  }
}

export const setName = (service: Service, displayName: string) => {
  service.name = service.constructor.name;
  service.displayName = displayName;
  service.setCharacteristic(Characteristic.Name, displayName);
  service.addOptionalCharacteristic(Characteristic.ConfiguredName);
  service.setCharacteristic(Characteristic.ConfiguredName, displayName);
  service.getCharacteristic(Characteristic.ConfiguredName).setProps({ perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS, Perms.HIDDEN] });
};

export const setPrimaryHidden = (service: Service, primary: boolean | undefined, hidden: boolean | undefined) => {
  if (primary) {
    service.setPrimaryService(primary);
  }
  if (hidden) {
    service.setHiddenService(hidden);
  }
};

export const setActiveFault = (service: Service, statusActive: boolean | undefined, statusFault: number | undefined) => {
  if (statusActive !== undefined) {
    service.addOptionalCharacteristic(Characteristic.StatusActive);
    service.setCharacteristic(Characteristic.StatusActive, statusActive);
  }
  if (statusFault !== undefined) {
    service.addOptionalCharacteristic(Characteristic.StatusFault);
    service.setCharacteristic(Characteristic.StatusFault, statusFault);
  }
};

export function logAccessory(accessory: Accessory, log: AnsiLogger) {
  // eslint-disable-next-line max-len
  log.debug(`Accessory ${id}${accessory.displayName}${rk}${rs}${db} UUID: ${accessory.UUID} AID: ${accessory.aid} cat ${hk}${HapCategoryNames[accessory.category]}${db} ${accessory.reachable ? wr + 'reachable' : er + 'not reachable'}${db} ${accessory.bridged === true ? wr + 'bridged' + db + ' with ' + accessory.bridge?._accessoryInfo?.displayName : 'not bridged'} `);
  for (const service of accessory.services) {
    // eslint-disable-next-line max-len
    log.debug(`==> ${zb}${service.constructor.name}${rs}${db} name ${hk}${service.name}${db} display ${hk}${service.displayName}${db} subtype ${hk}${service.subtype}${db} iid ${hk}${service.iid}${db} uuid ${hk}${service.UUID.slice(0, 8)}${db} ${service.isHiddenService === true ? `${wr}hidden${db}` : ''} ${service.isPrimaryService === true ? `${wr}primary${db}` : ''}`);
    for (const characteristic of service.characteristics) {
      const propsstring = debugStringify(characteristic.props);
      // eslint-disable-next-line max-len
      log.debug(`====> ${dn}${characteristic.constructor.name}-${characteristic.displayName}${db} value ${hk}${characteristic.value}${db} props ${hk}${propsstring}${db} iid ${hk}${characteristic.iid}${db} uuid ${hk}${characteristic.UUID.slice(0, 8)}${db}`);
    }
  }
}

