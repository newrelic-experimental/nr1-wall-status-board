/*
    Please set the configuration in config.json!
*/


import CONFIG from '../../config.json'
import React from 'react'
import BrandLogo from './brand_logo.png'
import NRLogo from './nrlogo.png'
import { StatusGroup, StatusBlock } from '../../components/BoardElements'
import WidgetNRQL from '../../components/BoardElements/WidgetNRQL'
import Configurator from '../../components/Configurator'
import { Spinner, nerdlet, NerdletStateContext, Link } from 'nr1'

export default class StatusBoardNerdlet extends React.Component {

    constructor(props) { 
        super(props);
        
        this.accountId=CONFIG.accountId //this can be overriden by widgets but is used for persistent storage
        this.storageCollection=CONFIG.storageCollection
        this.newrelicBaseUrl=CONFIG.newrelicBaseUrl

        //example config for when nerdlet is first installed
        this.defaultConfig={"autoRefresh":30,"pageAutoRotate":30,"pages":[{"title":"Operational Status","linkTitle":"Front End","groups":[{"title":"Group 1","widgets":[{"bucketSize":5,"untilSeconds":60,"additionalQueries":{"exampleQuery":"select uniqueCount(appName) as apps from Transaction "},"title":"Throughput","nrql":"select count(*)/5  as total from Transaction","field":"total","link":"https://www.google.com","customFeature":"example","thresholdDirection":"above","valueLabel":"Transactions","debugMode":false,"thresholdType":"numeric","valueSuffix":"rpm","roundTo":0},{"ph_title":"Example Placeholder","ph_status":"C","ph_label":"Something Bad"}]},{"title":"Backend","widgets":[{"ph_title":"Important Metric","ph_status":"W","ph_label":"An Example"}]},{"title":"Services","widgets":[{"ph_title":"Example Placeholder"}]}],"groupColumns":2},{"title":"Another Page!","linkTitle":"Page 2","groups":[{"title":"Example Group","widgets":[{"ph_title":"Placeholder","ph_status":"N"}]}],"groupColumns":1}]}
        
        this.state = { config: null, autoPage: null,chosenPage: null}
        this.autoPageTimer= null
        this.cyclePage=this.cyclePage.bind(this)
        this.schema = {
            "type": "object",
            "properties": {
                "autoRefresh": {
                    "type": "number",
                    "title": "Default refresh rate",
                    "description": "Specify the refresh for individual widgets in seconds",
                    "default": 30
                },
                "pageAutoRotate": {
                    "type": "number",
                    "title": "Auto rotate pages",
                    "description": "Specify number of seconds between each page. A value of zero means no rotation. TV mode only.",
                    "default":0
                },
                "pages": {
                    "type": "array",
                    "title": "Pages",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "title": "Page Title",
                                "desription": "Main title for the page"
                            },
                            "linkTitle": {
                                "type": "string",
                                "title": "Link title",
                                "description": "Link text for this page"
                            },
                            "groupColumns": {
                                "type": "number",
                                "title": "Number of groups per row",
                                "description": "Widgets are displayed in groups. These groups can either be in one, two or three columns.",
                                "enum": [1,2,3]
                            },
                            "groups": {
                                "type" : "array",
                                "title": "Groups",
                                "items" : {
                                    "type": "object",
                                    "properties": {
                                        "title": {
                                            "type": "string",
                                            "title": "Group name",
                                            "description": "Title for the group"
                                        },
                                        "widgets" : {
                                            "type": "array",
                                            "title": "Panels",
                                            "description": "Add as many widgets to the group as you like. They will be displayed in the order here.",
                                            "items": {
                                                "type": "object",
                                                "anyOf": [
                                                    {
                                                        "title": "NRQL query with threshold",
                                                        "properties": {
                                                            "title" : {
                                                                "type": "string",
                                                                "title": "Title"
                                                            },
                                                            "link" : {
                                                                "type": "string",
                                                                "title": "Link URL",
                                                                "description": "Optional URL to link to if widget is clicked"
                                                            },
                                                            "nrql" : {
                                                                "type": "string",
                                                                "title": "NRQL Query",
                                                                "description": "The query used to retrieve data. Do not include timeseries or facets."
                                                            },
                                                            "accountId" : {
                                                                "type": "string",
                                                                "title": "Account ID",
                                                                "description": "Optional: Provide a different account ID for this query. Leave blank to use the one set in config."
                                                            },
                                                            "field": {
                                                                "type": "string",
                                                                "title": "Value field name",
                                                                "description": "Name of the field containing the value to be tested against thresholds. Enable debug mode and look in the console log to understand which fields are vailable for your query."
                                                            },
                                                            "subField": {
                                                                "type": "string",
                                                                "title": "Value sub field name",
                                                                "description": "The subfield of the value, if there is one. e.g. for percentile results"
                                                            },
                                                            "roundTo": {
                                                                "type": "number",
                                                                "title": "Decimal places",
                                                                "description": "Decimal places to round numeric values to",
                                                                "default" : 2
                                                            },
                                                            "valueLabel": {
                                                                "type": "string",
                                                                "title": "Value label",
                                                                "description": "Optional: A label to display under the value. e.g. 'Throughput'"
                                                            },
                                                            "valueSuffix": {
                                                                "type": "string",
                                                                "title": "Value suffix",
                                                                "description": "Optional: A label to display alongside the value. e.g. 'rpm'"
                                                            },
                                                            "bucketSize": {
                                                                "type": "number",
                                                                "title": "Bucket size",
                                                                "default": 5,
                                                                "description": "The bucket size in minutes for the historical blocks."
                                                            },
                                                            "untilSeconds": {
                                                                "type": "number",
                                                                "title": "Seconds until",
                                                                "default": 60,
                                                                "description": "Number of seconds until now to ignore. This allows you to exlcude data that has only partially been reported."
                                                            },
                                                            "thresholdType" : {
                                                                "type": "string",
                                                                "enum": ["numeric", "string"],
                                                                "description": "Numeric thresholds allow you to set numeric limits. For string thresholds provide a regular expression."

                                                            },
                                                            "thresholdDirection" : {
                                                                "type": "string",
                                                                "enum": ["above", "below"],
                                                                "description": "For numeric thresholds: indicate if the threshold is breached if the value is above or below the threshold set."
                                                            },
                                                            "thresholdCritical": {
                                                                "type": "string",
                                                                "title": "Critical",
                                                                "description": "For numeric thresholds provide a number, for string thresholds provide a regex. Leave blank for none. "
                                                            },
                                                            "thresholdCriticalLabel": {
                                                                "type": "string",
                                                                "title": "Critical label",
                                                                "description": "Optional: If provided this text will be displayed instead of the value when in critical state."
                                                            },
                                                            "thresholdWarning": {
                                                                "type": "string",
                                                                "title": "Warning",
                                                                "description": "For numeric thresholds provide a number, for string thresholds provide a regex. Leave blank for none."
                                                            },
                                                            "thresholdWarningLabel": {
                                                                "type": "string",
                                                                "title": "Warning label",
                                                                "description": "Optional: If provided this text will be displayed instead of the value when in warning state."
                                                            } ,
                                                            "thresholdNormalLabel": {
                                                                "type": "string",
                                                                "title": "Normal label",
                                                                "description": "Optional: If provided this text will be displayed instead of the value when in normal state."
                                                            },
                                                            "debugMode": {
                                                                "type": "boolean",
                                                                "title": "Debug mode",
                                                                "default": false
                                                            },
                                                            "customFeature": {
                                                                "type":"string",
                                                                "title": "Custom feature",
                                                                "description": "Optional: If implemented: Indicate the custom feature key here"
                                                            },
                                                            "additionalQueries": {
                                                                "type": "object",
                                                                "title": "Additional queries",
                                                                "description": "Optional: Provide unique label and query for each extra query to be made (for custom feature support)",
                                                                "additionalProperties": {
                                                                    "type": "string"
                                                                }
                                                            }
                                                        }
                                                    },
                                                    {
                                                        "title": "Place holder",
                                                        "properties": {
                                                            "ph_title" : {
                                                                "type": "string",
                                                                "title": "Title",
                                                                "description": "Widget title"
                                                            },
                                                            "ph_status" : {
                                                                "type": "string",
                                                                "title": "Status",
                                                                "enum": ["N","W","C"],
                                                                "enumNames": ["Normal", "Warning", "Critical"],
                                                                "description": "Choose which state should be displayed"

                                                            },
                                                            "ph_label": {
                                                                "type": "string",
                                                                "title": "Label",
                                                                "description": "Optional: Label to appear under the value"
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
            
                                        }
            
                                    }
                                    
                                }
                            }
                            
                        }
                    }
                }
                
            }
        }
    }

    componentWillUnmount() {
        if(this.autoPageTimer){
            clearInterval(this.autoPageTimer)
        }
    }


    cyclePage(total) {
        const {autoPage} = this.state
        let nextPage=autoPage+1
        if(nextPage >= total) {
            nextPage=0
        }
        this.setState({"autoPage":nextPage})
    }

    nrqlThresholdWidget(config,autoRefresh, idx, page) {
        return <WidgetNRQL key={idx} accountId={this.accountId} config={config} autoRefresh={autoRefresh} pageRef={page}/>
    }

    placeHolderWidget(title,status,label,idx) {
        let rnd = (Math.random()*10).toFixed(2)
        let statusType="N"
        let statusHistory=[{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd}]
        if(status=="W") {
            statusType="W"
            statusHistory=[{status:"W", value: rnd},{status:"W", value: rnd},{status:"C", value: rnd},{status:"C", value: rnd},{status:"W", value: rnd},{status:"C", value: rnd},{status:"W", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd}]
        }
        if(status=="C") {
            statusType="C"
            statusHistory=[{status:"C", value: rnd},{status:"C", value: rnd},{status:"C", value: rnd},{status:"C", value: rnd},{status:"W", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"W", value: rnd},{status:"C", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"W", value: rnd},{status:"N", value: rnd},{status:"N", value: rnd}]
        }
        return <StatusBlock key={idx} title={title+"*"} bigValue={(Math.random()*10).toFixed(2)} bigValueLabel={label ? label : "Placeholder"} status={statusType} history={statusHistory}/>
    }


    render() {



        return  <NerdletStateContext.Consumer>
        {(nerdletState) => {
            let {config, autoPage, chosenPage} = this.state

            let statusBoard=<div className="ConfigLoader"><Spinner inline spacingType={[Spinner.SPACING_TYPE.NONE,Spinner.SPACING_TYPE.SMALL,Spinner.SPACING_TYPE.NONE,Spinner.SPACING_TYPE.NONE]} /> Loading configuration... </div>
            let pages, pagesTVMode, pageTitle, bottomConfigBar
            if(config && config.pages) {
                let statusBoardComponents=[]
                let currentPage,pageConfig
                if(nerdletState.tvMode===true && config.pageAutoRotate && config.pageAutoRotate > 0 && config.pages.length > 1) {
                    if(autoPage) {
                        currentPage=autoPage
                    } else {
                        currentPage=0
                        if(!this.autoPageTimer) {
                            this.autoPageTimer = setInterval(() => this.cyclePage(config.pages.length), config.pageAutoRotate * 1000)
                        }

                    }
                } else {
                    //no auto-rotate so just show selected page
                    currentPage=chosenPage!== null ? chosenPage  : 0;
                    
                }

                pageConfig=config.pages[currentPage]
                pageTitle=pageConfig.title


                if(pageConfig.groups && pageConfig.groups.length > 0) {
                    pageConfig.groups.forEach((group,idx)=>{

                        
                        if(group.widgets && group.widgets.length > 0) {
                            let statusBlocks=[]
                            group.widgets.forEach((widget,idx)=>{
                                
                                let widgetRender= <div>Not implemented</div>
                                    if(widget.title) {
                                        widgetRender = this.nrqlThresholdWidget(widget, config.autoRefresh,idx,currentPage)
                                    }
                                    if(widget.ph_title) {
                                        widgetRender = this.placeHolderWidget(widget.ph_title,widget.ph_status, widget.ph_label,idx)
                                    }
                                
                                statusBlocks.push(widgetRender)
                            })
                            let groupColumns = pageConfig.groupColumns ? pageConfig.groupColumns : 2
                            if(idx % groupColumns == 0 && idx > 0) {
                                statusBoardComponents.push(<div key={idx+'sep'}className="groupSeperator"><br /></div>)
                                //statusBoardComponents.push(<div key={idx+'sep2'}></div>) //just so there are even children of the odd/even selector
                            }
                            
                            statusBoardComponents.push(<StatusGroup key={idx} columns={6/groupColumns} title={group.title}>{statusBlocks}</StatusGroup>)                        
                        }

                    })

                }


                statusBoard=<>
                    <div className="GridContainer">
                        {statusBoardComponents}
                    </div>
                </>

                //page navigation 
                pages=config.pages.map((page,idx)=>{
                    const pageChangeFn=()=>{
                        this.setState({chosenPage: idx});
                    }
                    return <Link key={idx} className="u-unstyledLink pageLink" onClick={pageChangeFn}>{page.linkTitle ? page.linkTitle : page.title}</Link> 
                })

                let nerdletLocation=nerdlet.getSetUrlStateLocation({
                    page: currentPage,
                    tvMode: true
                })
                pagesTVMode=<a target="_blank" href={this.newrelicBaseUrl+nerdletLocation.pathname+'?tv-mode&'+nerdletLocation.search} className="u-unstyledLink pageLink" >TV Mode</a> 
                
    }
            
            //hide the nav and config when in full screen tv mode
            bottomConfigBar=<div className={nerdletState.tvMode===true ? "hideNavigation" : ""}>
                <div className="pageNavigation">
                    {pagesTVMode}
                    {pages}
                </div>

                <div className="configureButton">
                    <Configurator  
                        schema={this.schema}                                // schema for the config form data
                        dataChangeHandler={(data)=>{this.setState({config:data})}}        // callback function run when config changes
                        uiSchema={{
                            pages:{groups:{items:{widgets:{ items:{widgetType: {"ui:widget": "hidden"}}}}}}
                        }}

                        default={this.defaultConfig}

                        accountId={this.accountId}                                 // the accountId to store config against
                        storageCollectionId={this.storageCollection}             // the nerdstorage collection name to store config
                        documentId="config"                                 // the nerstorage document id prefix

                        buttonTitle="Configuration"                         // Some customisation of the configurator UI
                        modalTitle="Dashboard Configuration"
                        modalHelp="Use the form below to configure the dashboard widgets."

                    />
                </div>
            </div>
            




            return <div className="OuterContainer">
            <div className="LogoHeader">
                <img className="DashboardLogo" alt={pageTitle} src={BrandLogo} />
                <div className="NRLogo"><a href={this.newrelicBaseUrl}><img className="NRLogoImg" alt="New Relic" src={NRLogo} /></a></div>
                <div className="DashboardTitle">{pageTitle}</div>
            </div>
            {statusBoard}
            <div className="clear"></div>
            {bottomConfigBar}
        </div>
        }   
    } 
     </NerdletStateContext.Consumer>
    }
}


