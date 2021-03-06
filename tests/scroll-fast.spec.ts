import { debounce } from './miscellaneous/debounce';
import { makeTest, TestBedConfig } from './scaffolding/runner';
import { Misc } from './miscellaneous/misc';

describe('Fast Scroll Spec', () => {

  const configList = [{
    datasourceName: 'limited-1-100-no-delay',
    datasourceSettings: { startIndex: 1, bufferSize: 5, padding: 0.5, minIndex: 1, maxIndex: 100, adapter: true },
    templateSettings: { viewportHeight: 100 },
    custom: { items: 100, bounce: 5, start: 'top' },
    timeout: 5000
  }, {
    datasourceName: 'limited-1-100-no-delay',
    datasourceSettings: { startIndex: 1, bufferSize: 3, padding: 0.3, minIndex: 1, maxIndex: 100, adapter: true },
    templateSettings: { viewportHeight: 110 },
    custom: { items: 100, bounce: 8, start: 'top' },
    timeout: 5000
  }, {
    datasourceName: 'limited-51-200-no-delay',
    datasourceSettings: { startIndex: 51, bufferSize: 7, padding: 1.1, minIndex: 51, maxIndex: 200, adapter: true },
    templateSettings: { viewportHeight: 69 },
    custom: { items: 150, bounce: 6, start: 'top' },
    timeout: 5000
  }, {
    datasourceName: 'limited-51-200-no-delay',
    datasourceSettings: { startIndex: 51, bufferSize: 20, padding: 0.2, windowViewport: true, minIndex: 51, maxIndex: 200, adapter: true },
    templateSettings: { noViewportClass: true, viewportHeight: 0 },
    custom: { items: 150, bounce: 5, start: 'top' },
    timeout: 7000
  }];

  const configBofList = configList.map(config => ({
    ...config,
    custom: {
      ...config.custom,
      start: 'bottom'
    }
  }));

  const runFastScroll = (misc: Misc, customConfig: any, done: Function) => {
    misc.shared.fin = false;
    const scr = (iteration: number) => new Promise(success => {
      setTimeout(() => {
        misc.scrollMax();
        setTimeout(() => {
          if (iteration < customConfig.bounce || customConfig.start === 'top') {
            misc.scrollMin();
          }
          success();
        }, 25);
      }, 25);
    });
    let result = scr(0);
    for (let i = 1; i <= customConfig.bounce; i++) {
      result = result.then(() => scr(i));
    }
    result.then(() => {
      if (!misc.adapter.isLoading) {
        done();
      } else {
        misc.shared.fin = true;
      }
    });
  };

  const expectations = (config: TestBedConfig, misc: Misc, done: Function) => {
    const { scroller: { buffer } } = misc;
    const itemsCount = buffer.size;
    const bufferHeight = itemsCount * misc.itemHeight;
    const _size = misc.padding.backward.getSize() + misc.padding.forward.getSize() + bufferHeight;
    const totalItemsHeight = config.custom.items * misc.itemHeight;
    expect(_size).toBe(totalItemsHeight);
    expect(itemsCount).toBeGreaterThan(0);
    if (itemsCount) {
      if (misc.getScrollPosition() === 0) {
        const topElement = buffer.items[0].element;
        const topElementIndex = misc.getElementIndex(topElement);
        expect(topElementIndex).toBe(config.datasourceSettings.startIndex);
      } else {
        const bottomElement = buffer.items[buffer.size - 1].element;
        const bottomElementIndex = misc.getElementIndex(bottomElement);
        expect(bottomElementIndex).toBe(config.datasourceSettings.startIndex + config.custom.items - 1);
      }
    }
    done();
  };

  let expectationsTimer: any;
  const preExpectations = (config: TestBedConfig, misc: Misc, done: Function) => {
    const position = misc.getScrollPosition();
    const { scroller: { buffer }, adapter } = misc;
    const index = position === 0 ? 0 : buffer.size - 1;
    const runExpectations = () => {
      const edgeElement = buffer.items[index].element;
      const edgeElementIndex = misc.getElementIndex(edgeElement);
      const edgeIndex = config.datasourceSettings.startIndex + (position === 0 ? 0 : config.custom.items - 1);
      if (edgeIndex === edgeElementIndex) {
        expectations(config, misc, done);
      } else {
        misc[position === 0 ? 'scrollMax' : 'scrollMin']();
      }
    };
    if (!adapter.loopPending && buffer.size && buffer.items[index] && buffer.items[index].element) {
      runExpectations();
    } else {
      expectationsTimer = setTimeout(() => preExpectations(config, misc, done), 25);
    }
  };

  const checkFastScroll = (config: TestBedConfig) => (misc: Misc) => (done: Function) => {
    clearTimeout(expectationsTimer);
    const _done = debounce(() => preExpectations(config, misc, done), 25);
    spyOn(misc.workflow, 'finalize').and.callFake(() => {
      if (misc.workflow.cyclesDone === 1) {
        runFastScroll(misc, config.custom, done);
      } else if (misc.shared.fin) {
        _done();
      }
    });
  };

  describe('multi-bouncing to the BOF', () =>
    configList.map(config =>
      makeTest({
        title: 'should reach BOF without gaps',
        config,
        it: checkFastScroll(config)
      })
    )
  );

  describe('multi-bouncing to the EOF', () =>
    configBofList.map(config =>
      makeTest({
        title: 'should reach EOF without gaps',
        config,
        it: checkFastScroll(config)
      })
    )
  );

});

describe('Fast Scroll Spec (Throttle)', () => {
  const config: TestBedConfig = {
    datasourceName: 'infinite-promise-no-delay',
    datasourceSettings: { startIndex: 1, adapter: true },
    templateSettings: { viewportHeight: 200 },
    datasourceDevSettings: { throttle: 500 },
    timeout: 5000
  };

  makeTest({
    title: 'should throttle properly',
    config,
    it: (misc: Misc) => (done: Function) => {
      const COUNT = 10;
      let count = 0, timer: ReturnType<typeof setInterval>;
      spyOn(misc.workflow, 'finalize').and.callFake(() => {
        const { cyclesDone } = misc.workflow;
        if (cyclesDone === 1) {
          timer = setInterval(() => {
            count++;
            if (count % 2 === 0) {
              misc.scrollMin();
            } else {
              misc.scrollMax();
            }
            if (count === COUNT) {
              clearInterval(timer);
            }
          }, 25);
        } else if (cyclesDone === 3) {
          expect(count).toEqual(COUNT);
          done();
        }
      });
    }
  });
});
