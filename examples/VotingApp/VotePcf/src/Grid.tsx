import { useConst, useForceUpdate, useOnEvent } from '@fluentui/react-hooks';
import * as React from 'react';
import { IObjectWithKey, IRenderFunction, SelectionMode } from '@fluentui/react/lib/Utilities';
import { ConstrainMode, DetailsList, DetailsListLayoutMode, DetailsRow, IColumn, IDetailsHeaderProps, IDetailsListProps, IDetailsRowStyles } from '@fluentui/react/lib/DetailsList';
import { Sticky, StickyPositionType } from '@fluentui/react/lib/Sticky';
import { ContextualMenu, DirectionalHint, IContextualMenuProps } from '@fluentui/react/lib/ContextualMenu';
import { ScrollablePane, ScrollbarVisibility } from '@fluentui/react/lib/ScrollablePane';
import { Stack } from '@fluentui/react/lib/Stack';
import { Overlay } from '@fluentui/react/lib/Overlay';
import { IconButton } from '@fluentui/react/lib/Button';
import { Selection } from '@fluentui/react/lib/Selection';
import { Link } from '@fluentui/react/lib/Link';
import { Text } from '@fluentui/react/lib/Text';
import { VoteColumn, VoteCountColumn, VoteItem } from './VoteItem';
import { on } from 'events';
import { VoteCounter } from './VoteCounter';
import * as signalR from "@microsoft/signalr";

type DataSet = VoteItem & IObjectWithKey;

function stringFormat(template: string, ...args: string[]): string {
    for (const k in args) {
        template = template.replace('{' + k + '}', args[k]);
    }
    return template;
}

export interface GridProps {
    width?: number;
    height?: number;
    columns: ComponentFramework.PropertyHelper.DataSetApi.Column[];
    records: Record<string, VoteItem>;
    sortedRecordIds: string[];
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    currentPage: number;
    sorting: ComponentFramework.PropertyHelper.DataSetApi.SortStatus[];
    itemsLoading: boolean;
    setSelectedRecords: (ids: string[]) => void;
    onNavigate: (item?: VoteItem) => void;
    onVote: (id: string) => void;
    onSort: (name: string, desc: boolean) => void;
    loadFirstPage: () => void;
    loadNextPage: () => void;
    loadPreviousPage: () => void;
    onFullScreen: () => void;
    isFullScreen: boolean;
}

const onRenderDetailsHeader: IRenderFunction<IDetailsHeaderProps> = (props, defaultRender) => {
    if (props && defaultRender) {
        return (
            <Sticky stickyPosition={StickyPositionType.Header} isScrollSynced>
                {defaultRender({
                    ...props,
                })}
            </Sticky>
        );
    }
    return null;
};

export const Grid = React.memo((props: GridProps) => {
    const {
        records,
        sortedRecordIds,
        columns,
        width,
        height,
        hasNextPage,
        hasPreviousPage,
        sorting,
        currentPage,
        itemsLoading,
        setSelectedRecords,
        onNavigate,
        onVote,
        onSort,
        loadFirstPage,
        loadNextPage,
        loadPreviousPage,
        onFullScreen,
        isFullScreen,
    } = props;

    const forceUpdate = useForceUpdate();

    const onSelectionChanged = React.useCallback(() => {
        const items = selection.getItems() as DataSet[];
        const selected = selection.getSelectedIndices().map((index: number) => {
            const item: DataSet | undefined = items[index];
            return item && items[index].EntityRecord.getRecordId();
        });

        setSelectedRecords(selected);
        forceUpdate();
    }, [forceUpdate, setSelectedRecords]);

    const selection: Selection = useConst(() => {
        return new Selection({
            selectionMode: SelectionMode.single,
            onSelectionChanged: onSelectionChanged,
        });
    });

    const [isComponentLoading, setIsLoading] = React.useState<boolean>(false);

    const [contextualMenuProps, setContextualMenuProps] = React.useState<IContextualMenuProps>();

    const onContextualMenuDismissed = React.useCallback(() => {
        setContextualMenuProps(undefined);
    }, [setContextualMenuProps]);

    const getContextualMenuProps = React.useCallback(
        (column: IColumn, ev: React.MouseEvent<HTMLElement>): IContextualMenuProps => {
            const menuItems = [
                {
                    key: 'aToZ',
                    name: 'Label_SortAZ',
                    iconProps: { iconName: 'SortUp' },
                    canCheck: true,
                    checked: column.isSorted && !column.isSortedDescending,
                    disable: (column.data as ComponentFramework.PropertyHelper.DataSetApi.Column).disableSorting,
                    onClick: () => {
                        onSort(column.key, false);
                        setContextualMenuProps(undefined);
                        setIsLoading(true);
                    },
                },
                {
                    key: 'zToA',
                    name: 'Label_SortZA',
                    iconProps: { iconName: 'SortDown' },
                    canCheck: true,
                    checked: column.isSorted && column.isSortedDescending,
                    disable: (column.data as ComponentFramework.PropertyHelper.DataSetApi.Column).disableSorting,
                    onClick: () => {
                        onSort(column.key, true);
                        setContextualMenuProps(undefined);
                        setIsLoading(true);
                    },
                },
            ];
            return {
                items: menuItems,
                target: ev.currentTarget as HTMLElement,
                directionalHint: DirectionalHint.bottomLeftEdge,
                gapSpace: 10,
                isBeakVisible: true,
                onDismiss: onContextualMenuDismissed,
            };
        },
        [setIsLoading, setContextualMenuProps, onContextualMenuDismissed, onSort],
    );

    const onRenderItemColumn = React.useCallback(
    (
        item?: VoteItem,
        index?: number,
        column?: IColumn
    ) => {
        if (column && column.fieldName && item) {
            if (column.fieldName === VoteCountColumn.name) {
                return <VoteCounter Count={ item.voteCount } />;
            }
            else if (column.fieldName === VoteColumn.name) {
                return <IconButton alt="Vote"
                    iconProps={{ iconName: 'Like' }}
                    onClick={() => { onVote(item.id); }}
                />
            }
            else
                return <>{item?.EntityRecord.getFormattedValue(column.fieldName)}</>;
        }
            return <></>;
        }, [onVote]);

    const onColumnContextMenu = React.useCallback(
        (column?: IColumn, ev?: React.MouseEvent<HTMLElement>) => {
            if (column && ev) {
                setContextualMenuProps(getContextualMenuProps(column, ev));
            }
        },
        [getContextualMenuProps, setContextualMenuProps],
    );

    const onColumnClick = React.useCallback(
        (ev: React.MouseEvent<HTMLElement>, column: IColumn) => {
            if (column && ev) {
                setContextualMenuProps(getContextualMenuProps(column, ev));
            }
        },
        [getContextualMenuProps, setContextualMenuProps],
    );

    const items: (DataSet | undefined)[] = React.useMemo(() => {
        setIsLoading(false);

        const sortedRecords: (DataSet | undefined)[] = sortedRecordIds.map((id) => {
            const record = records[id];
            return record;
        });

        return sortedRecords;
    }, [records, sortedRecordIds, setIsLoading]);

    const onNextPage = React.useCallback(() => {
        setIsLoading(true);
        loadNextPage();
    }, [loadNextPage, setIsLoading]);

    const onPreviousPage = React.useCallback(() => {
        setIsLoading(true);
        loadPreviousPage();
    }, [loadPreviousPage, setIsLoading]);

    const onFirstPage = React.useCallback(() => {
        setIsLoading(true);
        loadFirstPage();
    }, [loadFirstPage, setIsLoading]);

    const gridColumns = React.useMemo(() => {
        return columns
            .sort((a, b) => a.order - b.order)
            .map((col) => {
                const sortOn = sorting && sorting.find((s) => s.name === col.name);
                return {
                    key: col.name,
                    name: col.displayName,
                    fieldName: col.name,
                    isSorted: sortOn != null,
                    isSortedDescending: sortOn?.sortDirection === 1,
                    isResizable: true,
                    data: col,
                    onColumnContextMenu: onColumnContextMenu,
                    onColumnClick: onColumnClick,
                } as IColumn;
            });
    }, [columns, sorting, onColumnContextMenu, onColumnClick]);

    const rootContainerStyle: React.CSSProperties = React.useMemo(() => {
        return {
            height: height,
            width: width,
        };
    }, [width, height]);

    const onRenderRow: IDetailsListProps['onRenderRow'] = (props) => {
        const customStyles: Partial<IDetailsRowStyles> = {};

        if (props && props.item) {
            const item = props.item as DataSet | undefined;

            return <DetailsRow {...props} styles={customStyles}/>;
        }

        return null;
    };

    return (
        <Stack verticalFill grow style={rootContainerStyle}>
            <Stack.Item grow style={{ position: 'relative', backgroundColor: 'white' }}>
                <ScrollablePane scrollbarVisibility={ScrollbarVisibility.auto}>
                    <DetailsList
                        columns={gridColumns}
                        onRenderItemColumn={onRenderItemColumn}
                        onRenderDetailsHeader={onRenderDetailsHeader}
                        items={items}
                        setKey={`set${currentPage}`} // Ensures that the selection is reset when paging
                        initialFocusedIndex={0}
                        selectionMode= { SelectionMode.none }
                        checkButtonAriaLabel="select row"
                        layoutMode={DetailsListLayoutMode.justified}
                        constrainMode={ConstrainMode.horizontalConstrained}
                        onItemInvoked={onNavigate}
                        onRenderRow={onRenderRow}
                    ></DetailsList>
                </ScrollablePane>
            </Stack.Item>
        </Stack>
    );
});

Grid.displayName = 'Grid';
