import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { HelloWorld, IHelloWorldProps } from "./HelloWorld";
import * as React from "react";
import { Grid, GridProps } from "./Grid";
import { VoteItem, VoteCountColumn, VoteColumn } from "./VoteItem";

export class Vote implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private theComponent: ComponentFramework.ReactControl<IInputs, IOutputs> | undefined;
    private notifyOutputChanged: (() => void) | undefined;
    private _context: ComponentFramework.Context<IInputs> | undefined;
    private _currentPage = 1;
    private _isFullScreen = false;
    private _gridProps: GridProps | undefined;

    private _records: {
        [id: string]: VoteItem;
    } = {};
    private _sortedRecordsIds: string[] = [];
    private _columns: ComponentFramework.PropertyHelper.DataSetApi.Column[] = [];

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param _context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param _state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     */
    public init(
        _context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param _context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     * @returns ReactElement root react element for the control
     */
    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {

      // this.openConnection();
      const dataset = context.parameters.VoteItems;
      const paging = context.parameters.VoteItems.paging;
      const datasetChanged = context.updatedProperties.indexOf("dataset") > -1;
      const resetPaging =
        datasetChanged &&
        !dataset.loading &&
        !dataset.paging.hasPreviousPage &&
        this._currentPage !== 1;

      if (context.updatedProperties.indexOf('fullscreen_close') > -1) {
        this._isFullScreen = false;
      }
      if (context.updatedProperties.indexOf('fullscreen_open') > -1) {
        this._isFullScreen = true;
      }

      if (resetPaging) {
        this._currentPage = 1;
      }
      if (resetPaging || datasetChanged || (this._columns.length - 2) != dataset.columns.length ||
        Object.entries(this._records).length != Object.entries(dataset.records).length) {
        this._records = {};
        this._columns = dataset.columns.map(column => column);
        for (const [key, value] of Object.entries(dataset.records)) {
          this._records[key] = new VoteItem(key, value);
        }
        this._sortedRecordsIds = dataset.sortedRecordIds;
        VoteCountColumn.order = this._columns.length;
        this._columns.push(VoteCountColumn);
        VoteColumn.order = this._columns.length;
        this._columns.push(VoteColumn);
      }

      // The test harness provides width/height as strings
      const allocatedWidth = parseInt(
        context.mode.allocatedWidth as unknown as string
      );
      const allocatedHeight = parseInt(
        context.mode.allocatedHeight as unknown as string
      );

      if (!this._gridProps) {
        this._gridProps = {
          version: 0,
          width: allocatedWidth,
          height: allocatedHeight,
          columns: this._columns,
          records: this._records,
          sortedRecordIds: this._sortedRecordsIds,
          hasNextPage: paging.hasNextPage,
          hasPreviousPage: paging.hasPreviousPage,
          currentPage: this._currentPage,
          sorting: dataset.sorting,
          itemsLoading: dataset.loading,
          setSelectedRecords: this.setSelectedRecords,
          onNavigate: this.onNavigate,
          onVote: this.onVote,
          onSort: this.onSort,
          loadFirstPage: this.loadFirstPage,
          loadNextPage: this.loadNextPage,
          loadPreviousPage: this.loadPreviousPage,
          onFullScreen: this.onFullScreen,
          isFullScreen: this._isFullScreen
        };
      }
      else {
        this._gridProps.width = allocatedWidth;
        this._gridProps.height = allocatedHeight;
        this._gridProps.sortedRecordIds = this._sortedRecordsIds;
        this._gridProps.records = this._records;
        this._gridProps.columns = this._columns;
      }
      return React.createElement(Grid, this._gridProps);
    }

    setSelectedRecords = (ids: string[]): void => {
        this._context?.parameters.VoteItems.setSelectedRecordIds(ids);
    }

    onNavigate = (item?: VoteItem): void => {
        if (item) {
            this._context?.parameters.VoteItems.openDatasetItem(item.EntityRecord.getNamedReference());
        }
    };

    onVote = (id: string): void => {
    //  if (!this._signalRApi)
    //    return;
    //  var xhr = new XMLHttpRequest();
    //  xhr.open("get", `${this._signalRApi}/vote/${id}`, true);
    //  xhr.setRequestHeader('Origin', window.location.origin);
    //  // xhr.setRequestHeader('x-ms-client-principal-name', this._userId!)
    //  xhr.send();
    }

    onSort = (name: string, desc: boolean): void => {
      if (!this._context) {
          return;
      }
      const sorting = this._context.parameters.VoteItems.sorting;
      while (sorting.length > 0) {
        sorting.pop();
      }
      this._context?.parameters.VoteItems.sorting.push({
        name: name,
        sortDirection: desc ? 1 : 0,
      });
      this._context?.parameters.VoteItems.refresh();
    };

    loadFirstPage = (): void => {
      this._currentPage = 1;
      this._context?.parameters.VoteItems.paging.loadExactPage(1);
    };

    loadNextPage = (): void => {
      this._currentPage++;
      this._context?.parameters.VoteItems.paging.loadExactPage(this._currentPage);
    };

    loadPreviousPage = (): void => {
      this._currentPage--;
      this._context?.parameters.VoteItems.paging.loadExactPage(this._currentPage);
    };

    onFullScreen = (): void => {
      this._context?.mode.setFullScreen(true);
    };

    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
     */
    public getOutputs(): IOutputs {
        return { };
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
