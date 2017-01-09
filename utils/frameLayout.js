/* Add bit operation functions to Buffer
 */
require('./buffer_bit')();
var FrameLayout = {
    //frame field offsets
    _SADDR 	  : 		0,
    _FC	      :   		1,

    // hdr is a nodejs Buffer
    GET_SADDR			: function( hdr ) {  return hdr.readUInt8(this._SADDR); 			   },
    GET_FC		        : function( hdr ) {  return hdr.readUInt8(this._FC); 		           },
    GET_DATALEN         : function( hdr ) {  return hdr.readUInt8(2);                          },
    GET_CHECKSUM	    : function( hdr ) {  return hdr.readUInt16LE(hdr.length - 2);          },
    GET_COIL            : function( hdr, len ) { var contents = [];
                                                for (var i = 0; i < len; i++) {
                                                    var reg = hdr[i + 3];

                                                    for (var j = 0; j < 8; j++) {
                                                        contents.push((reg & 1) == 1);
                                                        reg = reg >> 1;
                                                    }
                                                }
                                                return contents; 
                                                                                                },
    GET_REGISTER        : function( hdr, len ) {  var contents = [];

                                                for (var i = 0; i < len; i += 2) {
                                                    var reg = hdr.readUInt16BE(i + 3);
                                                    contents.push(reg);
                                                }
                                                return contents;
                                                                                                  },
    GET_DATA_ADDR       : function( hdr ) { return hdr.readUInt16BE(2);                           },
    GET_STATE           : function( hdr ) { return hdr.readUInt16BE(4);                           },
    GET_VALUE           : function( hdr ) { return hdr.readUInt16BE(4);                           },
    GET_NUM_REGISTERS   : function( hdr ) { return hdr.readUInt16BE(4);                           },
    GET_EXCEPTION_BYTE  : function( hdr ) { return hdr.readUInt8(2);                              },

    SET_SADDR           : function( hdr, v ) { return hdr.writeUInt8(v, this._SADDR);               },
    SET_FC              : function( hdr, v ) { return hdr.writeUInt8(v, this._FC);                  },
    SET_DATA_ADDR       : function( hdr, v ) { return hdr.writeUInt16BE(v, 2);                      },
    SET_NUM_COILS       : function( hdr, v ) { return hdr.writeUInt16BE(v, 4);                      },
    SET_NUM_REGISTERS   : function( hdr, v ) { return hdr.writeUInt16BE(v, 4);                      },
    SET_STATE           : function( hdr, v ) { return hdr.writeUInt16BE(v, 4);                      },
    SET_VALUE           : function( hdr, v ) { return hdr.writeUInt16BE(v, 4);                      },
    SET_DATA_BYTES      : function( hdr, v ) { return hdr.writeUInt8(v, 6);                         },
    SET_COIL            : function( hdr, v, len ) { 
                                                // clear the data bytes before writing bits data
                                                for (var i = 0; i < len; i++) {
                                                    hdr.writeUInt8(0, 7 + i);
                                                }

                                                for (var i = 0; i < v.length; i++) {
                                                    // buffer bits are already all zero (0)
                                                    // only set the ones set to one (1)
                                                    if (v[i]) {
                                                        hdr.writeBit(1, i, 7);
                                                    }
                                                }                                                   
                                                                                                    },
    SET_REGISTER        : function( hdr, v ) {
                                            for (var i = 0; i < v.length; i++) {
                                                hdr.writeUInt16BE(v[i], 7 + 2 * i);
                                            }
                                                                                                    },                                                                                              
    SET_CHECKSUM        : function( hdr, v ) { return hdr.writeUInt16LE(v, hdr.length - 2);         }
};

module.exports = FrameLayout;