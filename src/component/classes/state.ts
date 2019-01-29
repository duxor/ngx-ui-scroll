import { BehaviorSubject } from 'rxjs';

import {
  State as IState,
  ItemAdapter,
  WindowScrollState as IWindowScrollState,
  ScrollState as IScrollState,
  SyntheticScroll as ISyntheticScroll,
  WorkflowOptions as IWorkflowOptions
} from '../interfaces/index';
import { FetchModel } from './fetch';
import { Settings } from './settings';
import { Logger } from './logger';
import { itemAdapterEmpty } from './adapter';

class WindowScrollState implements IWindowScrollState {
  positionToUpdate: number;
  delta: number;

  constructor() {
    this.reset();
  }

  reset() {
    this.delta = 0;
    this.positionToUpdate = 0;
  }
}

class ScrollState implements IScrollState {
  firstScroll: boolean;
  firstScrollTime: number;
  lastScrollTime: number;
  scrollTimer: number | null;
  workflowTimer: number | null;
  scroll: boolean;
  keepScroll: boolean;
  window: IWindowScrollState;

  constructor() {
    this.window = new WindowScrollState();
    this.reset();
  }

  reset() {
    this.firstScroll = false;
    this.firstScrollTime = 0;
    this.lastScrollTime = 0;
    this.scrollTimer = null;
    this.workflowTimer = null;
    this.scroll = false;
    this.keepScroll = false;
    this.window.reset();
  }
}

class SyntheticScroll implements ISyntheticScroll {
  position: number | null;
  positionBefore: number | null;
  delta: number;
  time: number;
  readyToReset: boolean;
  timeBefore: number;

  constructor() {
    this.reset(null);
  }

  reset(position: number | null = null) {
    this.position = position;
    this.positionBefore = null;
    this.delta = 0;
    this.time = 0;
    this.readyToReset = false;
    this.timeBefore = 0;
  }
}

class WorkflowOptions implements IWorkflowOptions {
  empty: boolean;
  scroll: boolean;
  keepScroll: boolean;
  byTimer: boolean;

  constructor(settings: Settings) {
    this.reset();
  }

  reset() {
    this.empty = false;
    this.scroll = false;
    this.keepScroll = false;
    this.byTimer = false;
  }
}

export class State implements IState {

  protected settings: Settings;
  protected logger: Logger;

  initTime: number;
  innerLoopCount: number;
  isInitialLoop: boolean;
  workflowCycleCount: number;
  isInitialWorkflowCycle: boolean;
  countDone: number;
  workflowOptions: WorkflowOptions;

  startIndex: number;
  fetch: FetchModel;
  noClip: boolean;
  doClip: boolean;
  clipCall: number;
  lastPosition: number;
  preFetchPosition: number;
  preAdjustPosition: number;
  sizeBeforeRender: number;
  sizeAfterRender: number;
  fwdPaddingBeforeRender: number;
  bwdPaddingAverageSizeItemsCount: number;

  scrollState: IScrollState;
  syntheticScroll: ISyntheticScroll;

  loopPendingSource: BehaviorSubject<boolean>;
  workflowPendingSource: BehaviorSubject<boolean>;
  isLoadingSource: BehaviorSubject<boolean>;
  firstVisibleSource: BehaviorSubject<ItemAdapter>;
  lastVisibleSource: BehaviorSubject<ItemAdapter>;
  firstVisibleWanted: boolean;
  lastVisibleWanted: boolean;

  get loopPending(): boolean {
    return this.loopPendingSource.getValue();
  }

  set loopPending(value: boolean) {
    if (this.loopPending !== value) {
      this.loopPendingSource.next(value);
    }
  }

  get workflowPending(): boolean {
    return this.workflowPendingSource.getValue();
  }

  set workflowPending(value: boolean) {
    if (this.workflowPending !== value) {
      this.workflowPendingSource.next(value);
    }
  }

  get isLoading(): boolean {
    return this.isLoadingSource.getValue();
  }

  set isLoading(value: boolean) {
    if (this.isLoading !== value) {
      this.isLoadingSource.next(value);
    }
  }

  get firstVisibleItem(): ItemAdapter {
    return this.firstVisibleSource.getValue();
  }

  set firstVisibleItem(item: ItemAdapter) {
    if (this.firstVisibleItem.$index !== item.$index) {
      this.firstVisibleSource.next(item);
    }
  }

  get lastVisibleItem(): ItemAdapter {
    return this.lastVisibleSource.getValue();
  }

  set lastVisibleItem(item: ItemAdapter) {
    if (this.lastVisibleItem.$index !== item.$index) {
      this.lastVisibleSource.next(item);
    }
  }

  get time(): number {
    return Number(new Date()) - this.initTime;
  }

  constructor(settings: Settings, logger: Logger) {
    this.settings = settings;
    this.logger = logger;
    this.initTime = Number(new Date());
    this.innerLoopCount = 0;
    this.isInitialLoop = false;
    this.workflowCycleCount = 1;
    this.isInitialWorkflowCycle = false;
    this.countDone = 0;
    this.workflowOptions = new WorkflowOptions(settings);

    this.setCurrentStartIndex(settings.startIndex);
    this.fetch = new FetchModel();
    this.noClip = settings.infinite;
    this.doClip = false;
    this.clipCall = 0;
    this.sizeBeforeRender = 0;
    this.sizeAfterRender = 0;
    this.fwdPaddingBeforeRender = 0;
    this.bwdPaddingAverageSizeItemsCount = 0;

    this.scrollState = new ScrollState();
    this.syntheticScroll = new SyntheticScroll();

    this.loopPendingSource = new BehaviorSubject<boolean>(false);
    this.workflowPendingSource = new BehaviorSubject<boolean>(false);
    this.isLoadingSource = new BehaviorSubject<boolean>(false);
    this.firstVisibleSource = new BehaviorSubject<ItemAdapter>(itemAdapterEmpty);
    this.lastVisibleSource = new BehaviorSubject<ItemAdapter>(itemAdapterEmpty);
    this.firstVisibleWanted = false;
    this.lastVisibleWanted = false;
  }

  setCurrentStartIndex(newStartIndex: any) {
    const { startIndex, minIndex, maxIndex } = this.settings;
    let index = Number(newStartIndex);
    if (isNaN(index)) {
      this.logger.log(() =>
        `fallback startIndex to settings.startIndex (${startIndex}) because ${newStartIndex} is not a number`);
      index = startIndex;
    }
    if (index < minIndex) {
      this.logger.log(() => `setting startIndex to settings.minIndex (${minIndex}) because ${index} < ${minIndex}`);
      index = minIndex;
    }
    if (index > maxIndex) {
      this.logger.log(() => `setting startIndex to settings.maxIndex (${maxIndex}) because ${index} > ${maxIndex}`);
      index = maxIndex;
    }
    this.startIndex = index;
  }

}
