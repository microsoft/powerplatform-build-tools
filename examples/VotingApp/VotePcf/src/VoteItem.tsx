
export const VoteCountColumn: ComponentFramework.PropertyHelper.DataSetApi.Column = {
    name: "dpx_vote_count",
    displayName: "Vote Count",
    dataType: "Whole.None",
    order: 0,
    alias: "VoteCount",
    isHidden: false,
    visualSizeFactor: 100,
};

export const VoteColumn: ComponentFramework.PropertyHelper.DataSetApi.Column = {
    name: "dpx_count",
    displayName: "Vote",
    dataType: "SingleLine.Text",
    order: 0,
    alias: "Vote",
    isHidden: false,
    visualSizeFactor: 100,
};

export class VoteItem {
    public id: string;
    public voteCount: number;
    public EntityRecord: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

    constructor(id: string, EntityRecord: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord, voteCount = 0) {
        this.id = id;
        this.voteCount = voteCount;
        this.EntityRecord = EntityRecord;
    }
}
