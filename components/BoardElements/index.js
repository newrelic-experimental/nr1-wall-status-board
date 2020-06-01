import React, { Component } from 'react';
import { Grid, GridItem, Icon, Tooltip } from 'nr1'
import  moment from 'moment'

export class StatusGroup extends Component {
    render() {

        const {columns} = this.props
        let childGroups=[[]]
        let group=0
        React.Children.forEach(this.props.children, (child,idx) => {
            if(idx % columns == 0 && idx > 0) {
                group++  
                childGroups[group]=[]
            } 
            childGroups[group].push(<GridItem key={idx} columnSpan={12/columns}>{child}</GridItem>)

        })
        
        let childRender=childGroups.map((group,idx)=>{
            return <Grid key={idx}>{group}</Grid>
        })

        let width="95%"
        if(columns==3) { width="45%"}
        if(columns==2) { width="30%"}
    
        return <div className="GridGroup" style={ {width:width} } >
            <div>
                <h1>{this.props.title}</h1>
                <hr />
            </div>
            <div>
                {childRender}
            </div>
        </div>
 
    }
}

export  class StatusBlock extends Component {
    render() {

        let {title,status, bigValue, bigValueLabel, bigValueSuffix, history, info, infoTooltip, link } = this.props 

        if(!bigValueLabel) {bigValueLabel=<>&nbsp;</> }
        let className="StatusBlock normal"
        let headerIcon=""
        if(status== "C") { 
            className="StatusBlock critical"
            headerIcon=<div style={{float:"right"}}><Icon type={Icon.TYPE.INTERFACE__STATE__WARNING}/></div>
         }
        if(status== "W") { 
            className="StatusBlock warning"
            headerIcon=<div style={{float:"right"}}><Icon type={Icon.TYPE.INTERFACE__STATE__WARNING}/></div>
        }

        if(link) {
            className=className+" linkedWidget"
        }


        const generateBlock = function(data,idx) {

            let statusClass=""
            switch (data.status) {
                case "C": 
                    statusClass="HBCritical"
                    break
                case "W":
                    statusClass="HBWarning"
                    break
                default:
                    statusClass="HBNormal"
            }
            
            let toolTipMessage=`${data.value}`
            if(data.startTime && data.endTime) { 
                let timeFormat="HH:mm"
                if(data.endTime - data.startTime > 1800) { timeFormat="Do MMM HH:mm" }
                toolTipMessage=toolTipMessage+`\n${moment(data.startTime*1000).format(timeFormat)} until ${moment(data.endTime*1000).format(timeFormat)}`
             }

            let opacity=1//1-(0.9*(idx/23)) //different opacity for age, bad idea
            return <Tooltip key={idx} text={toolTipMessage}><div style={{opacity:opacity}} className={`HistoryBlock ${statusClass}`}>&nbsp;</div></Tooltip>
        }

        let StatusBlocks=[]
        for (let i=23; i >= 0; i--) {
            if(history && history[i] ) {
                StatusBlocks.push(generateBlock(history[i],i))
            } else {
                //StatusBlocks.push(<div className="HistoryBlock">&nbsp;</div>)
                StatusBlocks.push(<Tooltip key={i} text="No data"><div className={`HistoryBlock HBNormal}`}>&nbsp;</div></Tooltip>)
            }
            
        }

        let extraInfo=""
        if(info) {
            if(infoTooltip) {
                extraInfo=<Tooltip text={infoTooltip}><div className="ExtraInfo">{info}</div></Tooltip>
            } else { 
                extraInfo=<div className="ExtraInfo">{info}</div>
            }
        }
           
        let loadingData=""
        if(bigValue == null) {
            loadingData=<div className="WidgetLoading">Loading...</div>
        }

        let bigValueSuffixComponent=""
        if(bigValueSuffix) {
            bigValueSuffixComponent=<span className="BigValueSuffix">{bigValueSuffix}</span>
        }

        let clickFn=null
        if(link && link!="") {
            clickFn=()=>{window.open(link)}
        }


        return <div className={className} onClick={clickFn}>
            <div>
                <h2>{title}
                   {headerIcon}
                </h2>
            </div>
            {loadingData}
            <div>
                <div className="BigValue">{bigValue}{bigValueSuffixComponent}</div>
                <div className="BigValueLabel">{bigValueLabel}</div>
            </div>
           
            <div className="HistoryBlocksContainer">
            {extraInfo}
            <div className="HistoryBlocks">
                <div className="historyLabel historyLabelLeft">Older</div>
                <div className="historyLabel historyLabelRight">Recent</div>
                <div className="clear"></div>
                {StatusBlocks}
            </div>
            </div>
        </div>
 
    }
}
