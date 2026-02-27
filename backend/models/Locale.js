

const mongoose = require('mongoose');

const LocaleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    zone: {
      type: String,
      required: true
    },
    surface: {
      type: Number,
      required: true
    },
    etat: {
      type: String,
      enum: ["libre", "occupé", "maintenance"],
      default: "libre"
    },
    boutiqueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Boutique",
      default: null
    },
    image: {
      type: String,
      default: null,
      trim: true
    },

    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    }    
  }
);
// BoxSchema.pre('save', function (next) {
//   if (!this.isNew) {
//     this.updatedAt = new Date();
//   }
//   next();
// });
LocaleSchema.pre('save', function () {
  if (!this.isNew) {
    this.updatedAt = new Date();
  }
  // next();
});



module.exports =  mongoose.model("Locale", LocaleSchema);
