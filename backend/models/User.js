const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    unique: true,
    trim: true
  },
  motDePasse: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    select: false
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez fournir une adresse email valide']
  },
  contact: {
    type: String,
    required: [true, 'Le contact est obligatoire'],
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'responsable_boutique', 'acheteur'],
      message: 'Le rôle doit être admin, responsable_boutique ou acheteur'
    },
    default: 'acheteur'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash le mot de passe avant de sauvegarder
userSchema.pre('save', async function() {
  if (!this.isModified('motDePasse')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.motDePasse);
};

// Méthode pour obtenir l'utilisateur sans le mot de passe
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.motDePasse;
  return user;
};

module.exports = mongoose.model('User', userSchema);
