/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

import {
  wait,
  configs
} from '/common/common.js';
import { is /*, ok, ng*/ } from '/tests/assert.js';
//import Tab from '/common/Tab.js';

import * as Constants from '/common/constants.js';
import * as Utils from './utils.js';

let win;

export async function setup() {
  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [];
  win = await browser.windows.create();
}

export async function teardown() {
  await browser.windows.remove(win.id);
  win = null;
  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [];
}

async function expandAll(windowId) {
  await browser.runtime.sendMessage({
    type:  'treestyletab:api:expand-tree',
    tabId: '*',
    windowId
  });
  await wait(250);
}

async function collapseAll(windowId) {
  await browser.runtime.sendMessage({
    type:  'treestyletab:api:collapse-tree',
    tabId: '*',
    windowId
  });
  await wait(250);
}


async function assertFirstChildIsPromoted(closer) {
  let tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'A' },
      E: { index: 5 },
      F: { index: 6, openerTabId: 'E' },
      G: { index: 7, openerTabId: 'E' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => D',
      'E',
      'E => F',
      'E => G' ]
  );
  await expandAll(win.id);

  await (closer || closeTabsFromOutside)([tabs.B, tabs.E]);
  await wait(500);

  delete tabs.B;
  delete tabs.E;
  tabs = await Utils.refreshTabs(tabs);
  {
    const { A, C, D, F, G } = tabs;
    is([
      `${A.id}`,
      `${A.id} => ${C.id}`,
      `${A.id} => ${D.id}`,
      `${F.id}`,
      `${F.id} => ${G.id}`,
    ], Utils.treeStructure([A, C, D, F, G]),
       'the first child must be promoted');
  }
}

async function assertAllChildrenArePromoted(closer) {
  let tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5 },
      F: { index: 6, openerTabId: 'E' },
      G: { index: 7, openerTabId: 'E' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'E',
      'E => F',
      'E => G' ]
  );
  await expandAll(win.id);

  await (closer || closeTabsFromOutside)([tabs.B, tabs.E]);
  await wait(500);

  delete tabs.B;
  delete tabs.E;
  tabs = await Utils.refreshTabs(tabs);
  {
    const { A, C, D, F, G } = tabs;
    is([
      `${A.id}`,
      `${A.id} => ${C.id}`,
      `${A.id} => ${D.id}`,
      `${F.id}`,
      `${G.id}`,
    ], Utils.treeStructure([A, C, D, F, G]),
       'all children must be promoted');
  }
}

async function assertPromotedIntelligently(closer) {
  let tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5, openerTabId: 'A' },
      F: { index: 6 },
      G: { index: 7, openerTabId: 'F' },
      H: { index: 8, openerTabId: 'F' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'A => E',
      'F',
      'F => G',
      'F => H' ]
  );
  await expandAll(win.id);

  await (closer || closeTabsFromOutside)([tabs.B, tabs.F]);
  await wait(500);

  delete tabs.B;
  delete tabs.F;
  tabs = await Utils.refreshTabs(tabs);
  {
    const { A, C, D, E, G, H } = tabs;
    is([
      `${A.id}`,
      `${A.id} => ${C.id}`,
      `${A.id} => ${D.id}`,
      `${A.id} => ${E.id}`,
      `${G.id}`,
      `${G.id} => ${H.id}`,
    ], Utils.treeStructure([A, C, D, E, G, H]),
       'all children must be promoted if there parent, otherwise promote the first child');
  }
}

async function assertAllChildrenDetached(closer) {
  let tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5, openerTabId: 'A' },
      F: { index: 6 },
      G: { index: 7, openerTabId: 'F' },
      H: { index: 8, openerTabId: 'F' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'A => E',
      'F',
      'F => G',
      'F => H' ]
  );
  await expandAll(win.id);

  await (closer || closeTabsFromOutside)([tabs.B, tabs.F]);
  await wait(500);

  delete tabs.B;
  delete tabs.F;
  tabs = await Utils.refreshTabs(tabs);
  {
    const { A, C, D, E, G, H } = tabs;
    is([
      `${A.id}`,
      `${A.id} => ${E.id}`,
      `${C.id}`,
      `${D.id}`,
      `${G.id}`,
      `${H.id}`,
    ], Utils.treeStructure([A, E, C, D, G, H]),
       'all children must be detached');
  }
}

async function assertAllChildrenSimplyDetached(closer) {
  let tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5, openerTabId: 'A' },
      F: { index: 6 },
      G: { index: 7, openerTabId: 'F' },
      H: { index: 8, openerTabId: 'F' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'A => E',
      'F',
      'F => G',
      'F => H' ]
  );
  await expandAll(win.id);

  await (closer || closeTabsFromOutside)([tabs.B, tabs.F]);
  await wait(500);

  delete tabs.B;
  delete tabs.F;
  tabs = await Utils.refreshTabs(tabs);
  {
    const { A, C, D, E, G, H } = tabs;
    is([
      `${A.id}`,
      `${C.id}`,
      `${D.id}`,
      `${A.id} => ${E.id}`,
      `${G.id}`,
      `${H.id}`,
    ], Utils.treeStructure([A, C, D, E, G, H]),
       'all children must be detached at their original position');
  }
}

async function assertAllChildrenClosed(closer) {
  const tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5 },
      F: { index: 6, openerTabId: 'E' },
      G: { index: 7, openerTabId: 'E' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'E',
      'E => F',
      'E => G' ]
  );
  await expandAll(win.id);

  await (closer || closeTabsFromOutside)([tabs.B, tabs.E]);
  await wait(500);
  const afterTabs = await Promise.all(
    Array.from(Object.values(tabs))
      .map(tab => browser.tabs.get(tab.id).catch(_error => null))
  );
  is([tabs.A.id],
     afterTabs.filter(tab => !!tab).map(tab => tab.id),
     'all closed parents and their children must be removed, and only upper level tab must be left');
}

async function assertAllChildrenClosedUnderCollapsed(closer) {
  const tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5 },
      F: { index: 6, openerTabId: 'E' },
      G: { index: 7, openerTabId: 'E' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'E',
      'E => F',
      'E => G' ]
  );
  await collapseAll(win.id);

  await (closer || closeTabsFromOutside)([tabs.A, tabs.E]);
  await wait(500);
  const afterTabs = await Promise.all(
    Array.from(Object.values(tabs))
      .map(tab => browser.tabs.get(tab.id).catch(_error => null))
  );
  is([],
     afterTabs.filter(tab => !!tab).map(tab => tab.id),
     'all closed parents and their descendants must be removed');
}

async function assertClosedParentIsReplacedWithGroup(closer) {
  let tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5 },
      F: { index: 6, openerTabId: 'E' },
      G: { index: 7, openerTabId: 'E' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'E',
      'E => F',
      'E => G' ]
  );
  await expandAll(win.id);

  const beforeTabIds = new Set((await browser.tabs.query({ windowId: win.id })).map(tab => tab.id));
  await (closer || closeTabsFromOutside)([tabs.B, tabs.E]);
  await wait(500);
  const openedTabs = (await browser.tabs.query({ windowId: win.id })).filter(tab => !beforeTabIds.has(tab.id));
  is(2,
     openedTabs.length,
     'group tabs must be opened for closed parent tabs');

  delete tabs.B;
  delete tabs.E;
  tabs.opened1 = openedTabs[0];
  tabs.opened2 = openedTabs[1];

  tabs = await Utils.refreshTabs(tabs);
  {
    const { A, opened1, C, D, opened2, F, G} = tabs;
    is([
      `${A.id}`,
      `${A.id} => ${opened1.id}`,
      `${A.id} => ${opened1.id} => ${C.id}`,
      `${A.id} => ${opened1.id} => ${D.id}`,
      `${opened2.id}`,
      `${opened2.id} => ${F.id}`,
      `${opened2.id} => ${G.id}`,
    ], Utils.treeStructure([A, opened1, C, D, opened2, F, G]),
       'tree structure must be kept');
  }
}

async function closeTabsFromSidebar(tabs) {
  await browser.runtime.sendMessage({
    type:   Constants.kCOMMAND_REMOVE_TABS_BY_MOUSE_OPERATION,
    tabIds: tabs.map(tab => tab.id)
  });
}

async function closeTabsFromOutside(tabs) {
  await browser.tabs.remove(tabs.map(tab => tab.id));
}


export async function testPromoteFirstChild() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_FIRST_CHILD
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertFirstChildIsPromoted(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITH_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_FIRST_CHILD
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertFirstChildIsPromoted(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_FIRST_CHILD,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertFirstChildIsPromoted(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_FIRST_CHILD,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertFirstChildIsPromoted();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_FIRST_CHILD
  });

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted();
  await assertAllChildrenClosedUnderCollapsed();

}

export async function testPromoteOnlyFirstChildWhenClosedParentIsLastChild() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_FIRST_CHILD,
    promoteAllChildrenWhenClosedParentIsLastChild: false
  });
  configs.sidebarVirtuallyOpenedWindows = [win.id];

  let tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5 },
      F: { index: 6, openerTabId: 'E' },
      G: { index: 7, openerTabId: 'E' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'E',
      'E => F',
      'E => G' ]
  );
  await expandAll(win.id);

  await browser.tabs.remove([tabs.B.id, tabs.E.id]);
  await wait(500);

  delete tabs.B;
  delete tabs.E;
  tabs = await Utils.refreshTabs(tabs);
  {
    const { A, C, D, F, G } = tabs;
    is([
      `${A.id}`,
      `${A.id} => ${C.id}`,
      `${A.id} => ${C.id} => ${D.id}`,
      `${F.id}`,
      `${F.id} => ${G.id}`,
    ], Utils.treeStructure([A, C, D, F, G]),
       'only first child must be promoted');
  }
}

export async function testPromoteAllChildrenWhenClosedParentIsLastChild() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_FIRST_CHILD,
    promoteAllChildrenWhenClosedParentIsLastChild: true
  });
  configs.sidebarVirtuallyOpenedWindows = [win.id];

  let tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1 },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'B' },
      D: { index: 4, openerTabId: 'B' },
      E: { index: 5 },
      F: { index: 6, openerTabId: 'E' },
      G: { index: 7, openerTabId: 'E' } },
    win.id,
    [ 'A',
      'A => B',
      'A => B => C',
      'A => B => D',
      'E',
      'E => F',
      'E => G' ]
  );
  await expandAll(win.id);

  await browser.tabs.remove([tabs.B.id, tabs.E.id]);
  await wait(500);

  delete tabs.B;
  delete tabs.E;
  tabs = await Utils.refreshTabs(tabs);
  {
    const { A, C, D, F, G } = tabs;
    is([
      `${A.id}`,
      `${A.id} => ${C.id}`,
      `${A.id} => ${D.id}`,
      `${F.id}`,
      `${F.id} => ${G.id}`,
    ], Utils.treeStructure([A, C, D, F, G]),
       'all children must be promoted only when it is the last child');
  }
}

export async function testPromoteAllChildren() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenArePromoted(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertAllChildrenArePromoted();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITH_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenArePromoted(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted(); // should keep tree structure if possible
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenArePromoted(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenArePromoted();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertAllChildrenArePromoted();
  await assertAllChildrenClosedUnderCollapsed();
}

export async function testPromoteIntelligently() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_INTELLIGENTLY
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertPromotedIntelligently(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertPromotedIntelligently();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITH_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_INTELLIGENTLY
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertPromotedIntelligently(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted(); // should keep tree structure if possible
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_INTELLIGENTLY,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertPromotedIntelligently(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_INTELLIGENTLY,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertPromotedIntelligently();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_PROMOTE_INTELLIGENTLY
  });

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertPromotedIntelligently();
  await assertAllChildrenClosedUnderCollapsed();
}

export async function testDetachAllChildren() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenDetached(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertAllChildrenDetached();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITH_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenDetached(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted(); // should keep tree structure if possible
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenDetached(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenDetached();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertAllChildrenDetached();
  await assertAllChildrenClosedUnderCollapsed();
}

export async function testSimplyDetachAllChildren() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenSimplyDetached(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertAllChildrenSimplyDetached();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITH_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenSimplyDetached(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted(); // should keep tree structure if possible
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenSimplyDetached(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenSimplyDetached();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_SIMPLY_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertAllChildrenSimplyDetached();
  await assertAllChildrenClosedUnderCollapsed();
}

export async function testCloseAllChildren() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenClosed(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertAllChildrenClosed();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITH_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenClosed(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted(); // should keep tree structure if possible
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenClosed(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertAllChildrenClosed();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertAllChildrenClosed();
  await assertAllChildrenClosedUnderCollapsed();
}

export async function testReplaceRemovedParentWithGroup() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:         false,
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITHOUT_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_REPLACE_WITH_GROUP_TAB
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertClosedParentIsReplacedWithGroup(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertClosedParentIsReplacedWithGroup();
  await assertAllChildrenClosedUnderCollapsed();

  // https://github.com/piroor/treestyletab/issues/2818
  await Utils.setConfigs({
    closeParentBehaviorMode: Constants.kCLOSE_PARENT_BEHAVIOR_MODE_WITH_NATIVE_TABBAR,
    closeParentBehavior:     Constants.kCLOSE_PARENT_BEHAVIOR_REPLACE_WITH_GROUP_TAB
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertClosedParentIsReplacedWithGroup(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertFirstChildIsPromoted(); // should keep tree structure if possible
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_REPLACE_WITH_GROUP_TAB,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertClosedParentIsReplacedWithGroup(closeTabsFromSidebar);
  await assertAllChildrenClosedUnderCollapsed(closeTabsFromSidebar);

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_REPLACE_WITH_GROUP_TAB,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN
  });

  configs.sidebarVirtuallyOpenedWindows = [win.id];
  configs.sidebarVirtuallyClosedWindows = [];
  await assertClosedParentIsReplacedWithGroup();
  await assertAllChildrenClosedUnderCollapsed();

  await Utils.setConfigs({
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_DETACH_ALL_CHILDREN,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_REPLACE_WITH_GROUP_TAB
  });

  configs.sidebarVirtuallyOpenedWindows = [];
  configs.sidebarVirtuallyClosedWindows = [win.id];
  await assertClosedParentIsReplacedWithGroup();
  await assertAllChildrenClosedUnderCollapsed();
}

// https://github.com/piroor/treestyletab/issues/2819
export async function testKeepChildrenForTemporaryAggressiveGroupWithCloseParentWithAllChildrenBehavior() {
  await Utils.setConfigs({
    treatTreeAsExpandedOnClosedWithNoSidebar: false,
    warnOnCloseTabs:                    false,
    closeParentBehaviorMode:            Constants.kCLOSE_PARENT_BEHAVIOR_MODE_CUSTOM,
    closeParentBehavior:                Constants.kCLOSE_PARENT_BEHAVIOR_CLOSE_ALL_CHILDREN,
    closeParentBehavior_outsideSidebar: Constants.kCLOSE_PARENT_BEHAVIOR_REPLACE_WITH_GROUP_TAB,
    closeParentBehavior_noSidebar:      Constants.kCLOSE_PARENT_BEHAVIOR_REPLACE_WITH_GROUP_TAB
  });
  configs.sidebarVirtuallyOpenedWindows = [win.id];

  const tabs = await Utils.prepareTabsInWindow(
    { A: { index: 1, url: `${Constants.kSHORTHAND_URIS.group}?temporaryAggressive=true` },
      B: { index: 2, openerTabId: 'A' },
      C: { index: 3, openerTabId: 'A' } },
    win.id,
    [ 'A',
      'A => B',
      'A => C' ]
  );
  await expandAll(win.id);

  const beforeTabs = await browser.tabs.query({ windowId: win.id });
  await browser.tabs.remove(tabs.C.id);
  await wait(500);
  const afterTabs = await browser.tabs.query({ windowId: win.id });
  is(beforeTabs.length - 2,
     afterTabs.length,
     'only the group parent tab should be cleaned up');
  is(afterTabs[afterTabs.length - 1].id,
     tabs.B.id,
     'other children of the group parent tab must be kept');
}

