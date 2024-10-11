/**
 * This file contains the helpers for HAP-NodeJS and homebridge packages.
 *
 * @file hapCustom.ts
 * @author Luca Liguori
 * @date 2023-11-13
 * @version 1.0.9
 *
 * All rights reserved.
 *
 */

import {
  API,
  Service,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  CharacteristicChange,
  Perms,
  WithUUID,
  CharacteristicGetHandler,
  CharacteristicSetHandler,
  VoidCallback,
  Categories,
  PlatformAccessory,
  CharacteristicProps,
} from 'homebridge';
import * as crypto from 'crypto';
import { AnsiLogger, debugStringify, db, dn, er, hk, id, rk, rs, wr, zb } from 'node-ansi-logger';
import { NodeStorage, NodeStorageKey } from 'node-persist-manager';

export const HapCategoryNames: Record<number, string> = {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CharacteristicContext = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HAPConnection = any;
export declare const enum CharacteristicWarningType {
  SLOW_WRITE = 'slow-write',
  TIMEOUT_WRITE = 'timeout-write',
  SLOW_READ = 'slow-read',
  TIMEOUT_READ = 'timeout-read',
  WARN_MESSAGE = 'warn-message',
  ERROR_MESSAGE = 'error-message',
  DEBUG_MESSAGE = 'debug-message',
}
export type CharacteristicGetListener = (callback: CharacteristicGetCallback, context: CharacteristicContext, connection?: HAPConnection) => void;
export type CharacteristicSetListener = (value: CharacteristicValue, callback: CharacteristicSetCallback, context: CharacteristicContext, connection?: HAPConnection) => void;
export type CharacteristicChangeListener = (change: CharacteristicChange) => void;
export type CharacteristicSubscribeListener = VoidCallback;
export type CharacteristicUnsubscribeListener = VoidCallback;
export type CharacteristicWarningListener = (type: CharacteristicWarningType, message: string, stack?: string) => void;

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

export const createServiceAccessoryInformation = (api: API, accessory: PlatformAccessory, displayName: string, optionalParams?: AccessoryInformationParams) => {
  const Service = api.hap.Service;
  const Characteristic = api.hap.Characteristic;
  const params: AccessoryInformationParams = Object.assign(
    {
      model: 'Hap Model',
      manufacturer: 'Hap Manufacturer',
      serialNumber: crypto.randomBytes(8).toString('hex'),
      firmwareRevision: '1.0.0',
      hardwareRevision: undefined, // '1.0.0',
      softwareRevision: undefined, // '1.0.0',
      statusActive: undefined, // true,
      statusFault: undefined, // Characteristic.StatusFault.NO_FAULT,
      hidden: undefined,
      primary: undefined,
      onSetIdentify: undefined,
      onSetIdentifyAsync: undefined,
    },
    optionalParams,
  );
  const service = accessory.getService(Service.AccessoryInformation) || accessory.addService(new Service.AccessoryInformation(displayName));
  setName(api, service, displayName);
  service.setCharacteristic(Characteristic.Model, params.model || 'Hap Model');
  service.setCharacteristic(Characteristic.Manufacturer, params.manufacturer || 'Hap Manufacturer');
  service.setCharacteristic(Characteristic.SerialNumber, params.serialNumber || crypto.randomBytes(8).toString('hex'));
  if (params.firmwareRevision) {
    service.setCharacteristic(Characteristic.FirmwareRevision, params.firmwareRevision);
  }
  if (params.hardwareRevision) {
    service.setCharacteristic(Characteristic.HardwareRevision, params.hardwareRevision);
  }
  if (params.softwareRevision) {
    service.setCharacteristic(Characteristic.SoftwareRevision, params.softwareRevision);
  }
  setActiveFault(api, service, params.statusActive, params.statusFault);
  setPrimaryHidden(api, service, params.primary, params.hidden);
  if (params.onSetIdentify) {
    service.getCharacteristic(Characteristic.Identify).on(CharacteristicEventTypes.SET, params.onSetIdentify);
  } else if (params.onSetIdentifyAsync) {
    service.getCharacteristic(Characteristic.Identify).onSet(params.onSetIdentifyAsync);
  }
  return service;
};

export function MoveToPosition(api: API, service: Service, targetPosition: number, durationSeconds: number, executeCommand?: (command: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Service = api.hap.Service;
  const Characteristic = api.hap.Characteristic;
  let currentPosition = service.getCharacteristic(Characteristic.CurrentPosition).value as number;
  const positionState = service.getCharacteristic(Characteristic.PositionState).value;
  if (positionState !== Characteristic.PositionState.STOPPED) {
    // eslint-disable-next-line no-console
    console.log('Already moving so stop it and return');
    HoldPosition(api, service, currentPosition);
    executeCommand?.('stop');
    return;
  }

  if (targetPosition > currentPosition) {
    // Opening
    const steps = targetPosition - currentPosition;
    const duration = (steps * durationSeconds) / 100;
    // eslint-disable-next-line no-console
    console.log('Opening current', currentPosition, 'target', targetPosition, 'duration', duration, 'steps', steps);
    service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.INCREASING);
    executeCommand?.('open');
    const timeout = setInterval(
      () => {
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
      },
      (duration / steps) * 1000,
    );
  }

  if (targetPosition < currentPosition) {
    // Closing
    const steps = currentPosition - targetPosition;
    const duration = (steps * durationSeconds) / 100;
    // eslint-disable-next-line no-console
    console.log('Closing current', currentPosition, 'target', targetPosition, 'duration', duration, 'steps', steps);
    service.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.DECREASING);
    executeCommand?.('close');
    const timeout = setInterval(
      () => {
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
      },
      (duration / steps) * 1000,
    );
  }
}

export function HoldPosition(api: API, service: Service, currentPosition: number, executeCommand?: (command: string) => void) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Service = api.hap.Service;
  const Characteristic = api.hap.Characteristic;
  // eslint-disable-next-line no-console
  console.log('HoldPosition currentPosition', currentPosition);
  service.updateCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED);
  service.updateCharacteristic(Characteristic.CurrentPosition, currentPosition);
  service.updateCharacteristic(Characteristic.TargetPosition, currentPosition);
  executeCommand?.('stop');
}

export interface BaseServiceParams {
  statusActive?: boolean; // true,
  statusFault?: number; // Characteristic.StatusFault.NO_FAULT,
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

export const createServiceWindowCovering = async (api: API, accessory: PlatformAccessory, displayName: string, optionalParams?: WindowCoveringParams) => {
  const Service = api.hap.Service;
  const Characteristic = api.hap.Characteristic;
  const params: WindowCoveringParams = Object.assign(
    {
      currentPosition: 0,
      targetPosition: 0,
      positionState: Characteristic.PositionState.STOPPED, // read
      obstructionDetected: undefined, // boolean
      holdPosition: undefined, // boolean write
      statusActive: undefined, // true,
      statusFault: undefined, // Characteristic.StatusFault.NO_FAULT,
      hidden: undefined,
      primary: undefined,
      onChangeCurrentPosition: undefined,
      onGetCurrentPosition: undefined,
      onSetTargetPosition: undefined,
      onSetHoldPosition: undefined,
    },
    optionalParams,
  );
  const service = accessory.getService(Service.WindowCovering) || accessory.addService(new Service.WindowCovering(displayName));
  setName(api, service, displayName);
  service.setCharacteristic(
    Characteristic.CurrentPosition,
    params.nodeStorage ? await params.nodeStorage.get<number>('currentPosition', params.currentPosition) : params.currentPosition,
  );
  service.setCharacteristic(
    Characteristic.TargetPosition,
    params.nodeStorage ? await params.nodeStorage.get<number>('targetPosition', params.targetPosition) : params.targetPosition,
  );
  service.setCharacteristic(Characteristic.PositionState, params.nodeStorage ? await params.nodeStorage.get<number>('positionState', params.positionState) : params.positionState);
  if (params.obstructionDetected !== undefined) {
    service.setCharacteristic(
      Characteristic.ObstructionDetected,
      params.nodeStorage ? await params.nodeStorage.get<boolean>('obstructionDetected', params.obstructionDetected) : params.obstructionDetected,
    );
  }
  if (params.holdPosition !== undefined) {
    service.setCharacteristic(Characteristic.HoldPosition, params.nodeStorage ? await params.nodeStorage.get<boolean>('holdPosition', params.holdPosition) : params.holdPosition);
  }
  setActiveFault(api, service, params.statusActive, params.statusFault);
  setPrimaryHidden(api, service, params.primary, params.hidden);
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

export interface CharacteristicDefinition {
  name: string;
  UUID: string;
  props: CharacteristicProps;
  value: CharacteristicValue;
}

export async function addCharacteristic<S extends WithUUID<typeof Service>>(
  api: API,
  accessory: PlatformAccessory,
  service: string | S,
  characteristic: CharacteristicDefinition,
  params: AddCharacteristicParams,
) {
  // console.log(characteristic);
  const _service = accessory.getService(service);
  if (!_service) {
    return;
  }
  let _characteristic = new api.hap.Characteristic(characteristic.name, characteristic.UUID, characteristic.props);

  let isOptional = false;
  _service.optionalCharacteristics.forEach((optionalCharacteristic) => {
    if (optionalCharacteristic.UUID === _characteristic.UUID) {
      isOptional = true;
      return;
    }
  });
  if (!isOptional) {
    _service.addOptionalCharacteristic(_characteristic);
  }

  let isPresent = false;
  _service.characteristics.forEach((characteristic) => {
    if (characteristic.UUID === _characteristic.UUID) {
      _characteristic = characteristic;
      isPresent = true;
      return;
    }
  });
  if (!isPresent) {
    _characteristic = _service.addCharacteristic(_characteristic);
  }

  if (params.value !== undefined) {
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

export const setName = (api: API, service: Service, displayName: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Service = api.hap.Service;
  const Characteristic = api.hap.Characteristic;

  service.name = service.constructor.name;
  service.displayName = displayName;
  service.setCharacteristic(Characteristic.Name, displayName);
  service.addOptionalCharacteristic(Characteristic.ConfiguredName);
  service.setCharacteristic(Characteristic.ConfiguredName, displayName);
  service.getCharacteristic(Characteristic.ConfiguredName).setProps({ perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.EVENTS, Perms.HIDDEN] });
};

export const setPrimaryHidden = (api: API, service: Service, primary: boolean | undefined, hidden: boolean | undefined) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Service = api.hap.Service;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Characteristic = api.hap.Characteristic;
  if (primary) {
    service.setPrimaryService(primary);
  }
  if (hidden) {
    service.setHiddenService(hidden);
  }
};

export const setActiveFault = (api: API, service: Service, statusActive: boolean | undefined, statusFault: number | undefined) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const Service = api.hap.Service;
  const Characteristic = api.hap.Characteristic;
  if (statusActive !== undefined) {
    service.addOptionalCharacteristic(Characteristic.StatusActive);
    service.setCharacteristic(Characteristic.StatusActive, statusActive);
  }
  if (statusFault !== undefined) {
    service.addOptionalCharacteristic(Characteristic.StatusFault);
    service.setCharacteristic(Characteristic.StatusFault, statusFault);
  }
};

export function logAccessory(accessory: PlatformAccessory, log: AnsiLogger) {
  log.debug(
    `Accessory ${id}${accessory.displayName}${rk}${rs}${db} UUID: ${accessory.UUID} AID: ${accessory._associatedHAPAccessory.aid} cat ${hk}${HapCategoryNames[accessory.category]}${db} ${accessory._associatedHAPAccessory.reachable ? wr + 'reachable' : er + 'not reachable'}${db} ${accessory._associatedHAPAccessory.bridged === true ? wr + 'bridged' + db + ' with ' + accessory._associatedHAPAccessory.bridge?._accessoryInfo?.displayName : 'not bridged'} `,
  );
  for (const service of accessory.services) {
    log.debug(
      `==> ${zb}${service.constructor.name}${rs}${db} name ${hk}${service.name}${db} display ${hk}${service.displayName}${db} subtype ${hk}${service.subtype}${db} iid ${hk}${service.iid}${db} uuid ${hk}${service.UUID.slice(0, 8)}${db} ${service.isHiddenService === true ? `${wr}hidden${db}` : ''} ${service.isPrimaryService === true ? `${wr}primary${db}` : ''}`,
    );
    for (const characteristic of service.characteristics) {
      const propsstring = debugStringify(characteristic.props);
      log.debug(
        `====> ${dn}${characteristic.constructor.name}-${characteristic.displayName}${db} value ${hk}${characteristic.value}${db} props ${hk}${propsstring}${db} iid ${hk}${characteristic.iid}${db} uuid ${hk}${characteristic.UUID.slice(0, 8)}${db}`,
      );
    }
  }
}
