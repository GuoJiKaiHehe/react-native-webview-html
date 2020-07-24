# react-native-webview-html
static propTypes = {
  onClickImg:PropTypes.func,
  renderLoading:PropTypes.func,
  content:PropTypes.string,
};
static defaultProps = {
  onClickImg(){},
  content:"",
};

```
(<AutoHeightWebView 
			{...this.props}
			// onLoadStart={syntheticEvent => {
//           // update component to be aware of loading status
//               const { nativeEvent } = syntheticEvent;
//               this.setState({
//               	isLoading:nativeEvent.loading,
//               })
//           }}
//           onLoadEnd={syntheticEvent => {
//            // update component to be aware of loading status
//            const { nativeEvent } = syntheticEvent;
//            // this.isLoading = nativeEvent.loading;
//             this.setState({
//               	isLoading:nativeEvent.loading,
//               });
//         }}

			source={{html:content}}
			style={[{marginTop: 0 ,height:this.state.htmlHegiht||30,width:'100%'}]}
			onSizeUpdated={(size)=>{
		    	console.log("size",size)
		    	if(size.height!=this.state.htmlHegiht){
		    		console.log("size",size);
			    	this.setState({
			    		htmlHegiht:size.height,
			    	});
			    	
		    	}
		    }}
		    startInLoadingState={true}
		    renderLoading={()=>{
		    	if(this.props.renderLoading){
		    		return this.props.renderLoading();
		    	}
		    	return <ActivityIndicator size= 'large'  />
		    }}
		    onClickImg={(data)=>{
		    	// {urls:[],curIndex:0}
		    	this.props.onClickImg && this.props.onClickImg(data);

		    }}
		    zoomable={false}
		    scrollEnabledWithZoomedin={false}

		    viewportContent={'viewport-fit=cover,user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0'}
		    // disableTouchHideKeyboard={true}
		    customScript={`

		    	`}
		    scalesPageToFit={true}
		    customStyle={`
			     img{
			     	max-width:100%!important;
			     	height:auto!important;
			     	object-fit:contain;

			     }
			     p{
			     	text-align:justify;
			     }
			     body{

			     }
			    `}
			/>)
```			