import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getTabProps } from './helpers/childrenUtils'
import {
  isTabElement,
  isTabListElement,
  isTabPanelElement,
} from './helpers/elementTypes'
import type { TabProps } from './Tab'

export type TabsComponent<T> = ((props: T) => JSX.Element) & {
  tabsRole: string
}

export type TabsClassNames = Partial<{
  tabList: string
  tab: string
  tabActive: string
  tabDisabled: string
  tabPanel: string
  tabPanelActive: string
  tabPanelDisabled: string
}>

export interface TabsProps {
  children: React.ReactNode
  classNames?: TabsClassNames
  onSelect?: (index: number, lastIndex: number) => void
  onNameSelect?: (name?: string, lastName?: string) => void
  selected?: number | string
}

const Tabs = ({
  children,
  classNames,
  onNameSelect,
  onSelect,
  selected,
}: TabsProps) => {
  const id = useId()
  const tabProps = useMemo(() => getTabProps(children), [children])
  const tabNames = useMemo(() => tabProps.map((tab) => tab.name), [tabProps])
  const tabIds = useRef(tabProps.map((_, i) => `${id}-${i}`))
  const [{ index: currentIndex, name: currentName }, setSelected] = useState(
    computeState(tabNames, selected)
  )

  useEffect(() => {
    setSelected(computeState(tabNames, selected))
  }, [selected, tabNames])

  const handleSelect = useCallback(
    (index: number, name?: string) => {
      setSelected({
        index,
        name,
      })
      onSelect?.(index, currentIndex)
      onNameSelect?.(name, currentName)
    },
    [currentIndex, currentName, onNameSelect, onSelect]
  )

  const selectNext = useCallback(() => {
    if (tabProps.every((tab) => tab.disabled)) {
      return
    }

    const nextIndex = getNextIndex(currentIndex, tabProps)
    const nextName = tabNames[nextIndex]

    handleSelect(nextIndex, nextName)
  }, [currentIndex, handleSelect, tabNames, tabProps])

  const selectPrevious = useCallback(() => {
    if (tabProps.every((tab) => tab.disabled)) {
      return
    }

    const nextIndex = getPreviousIndex(currentIndex, tabProps)
    const nextName = tabNames[nextIndex]

    handleSelect(nextIndex, nextName)
  }, [currentIndex, handleSelect, tabNames, tabProps])

  const getChildren = useCallback(() => {
    let tabPanelIndex = 0

    const idsToCreate = tabNames.length - tabIds.current.length
    tabIds.current.push(
      ...Array.from(new Array(idsToCreate)).map(
        (_, index) => `${id}-${tabNames.length + index - 1}`
      )
    )

    return React.Children.map(children, (child) => {
      if (isTabListElement(child)) {
        return React.cloneElement(child, {
          ...child.props,
          children: React.Children.map(child.props.children, (tab, index) => {
            if (isTabElement(tab)) {
              return React.cloneElement(tab, {
                className: classNames?.tab,
                classNameActive: classNames?.tabActive,
                classNameDisabled: classNames?.tabDisabled,
                ...tab.props,
                active: index === currentIndex,
                'aria-controls': `${tabIds.current[index]}-panel`,
                id: `${tabIds.current[index]}-tab`,
                onClick: () => handleSelect(index, tab.props.name),
              })
            }

            return tab
          }),
          className: classNames?.tabList,
          onArrowLeftKeyDown: selectPrevious,
          onArrowRightKeyDown: selectNext,
        })
      }

      if (isTabPanelElement(child)) {
        const panelIndex = Number.isInteger(child.props.index)
          ? (child.props.index as number)
          : tabPanelIndex
        const panelElement = React.cloneElement(child, {
          className: classNames?.tabPanel,
          classNameActive: classNames?.tabPanelActive,
          classNameDisabled: classNames?.tabPanelDisabled,
          ...child.props,
          active: panelIndex === currentIndex,
          disabled: tabProps[panelIndex].disabled,
          id: `${tabIds.current[panelIndex]}-panel`,
          'aria-labelledby': `${tabIds.current[panelIndex]}-tab`,
        })

        tabPanelIndex += 1

        return panelElement
      }

      return child
    })
  }, [
    children,
    classNames,
    currentIndex,
    handleSelect,
    id,
    selectNext,
    selectPrevious,
    tabNames.length,
    tabProps,
  ])

  return <>{getChildren()}</>
}

function computeState(
  tabNames: (string | undefined)[],
  selected?: number | string
): {
  index: number
  name?: string
} {
  if (Number.isInteger(selected)) {
    return { index: selected as number, name: tabNames[selected as number] }
  }
  if (selected) {
    return {
      index: tabNames.indexOf(selected as string),
      name: selected as string,
    }
  }
  return { index: 0, name: tabNames[0] }
}

function getNextIndex(currentIndex: number, tabProps: TabProps[]) {
  let nextIndex = currentIndex < tabProps.length - 1 ? currentIndex + 1 : 0
  while (tabProps[nextIndex].disabled) {
    nextIndex = nextIndex < tabProps.length - 1 ? nextIndex + 1 : 0
  }

  return nextIndex
}

function getPreviousIndex(currentIndex: number, tabProps: TabProps[]) {
  let previousIndex = currentIndex > 0 ? currentIndex - 1 : tabProps.length - 1
  while (tabProps[previousIndex].disabled) {
    previousIndex = previousIndex > 0 ? previousIndex - 1 : tabProps.length - 1
  }

  return previousIndex
}

export default Tabs
