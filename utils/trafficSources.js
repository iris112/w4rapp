module.exports = [
//  {name:'Google', regex:/^https?:\/\/(?:www\.)?google\.(com|ca|ch)((\?|\/).*)?$/i, type:'search'},
  {name:'Google', regex:/google/i, type:'search'},
  {name:'Facebook', regex:/facebook/i, type:'social media'},
  {name:'Twitter', regex:/twitter/i, type:'social media'},
  {name:'Realtor', regex:/realtor.ca|torontomls/i, type:'realtor'},
  {name:'LinkedIn', regex:/linkedin.com/i, type:'social media'},
  {name:'Yahoo', regex:/yahoo.com/i, type:'search'},
  {name:'Bing', regex:/bing.com/i, type:'search'}
];