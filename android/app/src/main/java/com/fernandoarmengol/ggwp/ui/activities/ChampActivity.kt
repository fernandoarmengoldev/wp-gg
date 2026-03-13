package com.fernandoarmengol.ggwp.ui.activities

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.bumptech.glide.Glide
import com.bumptech.glide.request.target.DrawableImageViewTarget
import com.fernandoarmengol.ggwp.GlobalVar.Companion.champCD
import com.fernandoarmengol.ggwp.GlobalVar.Companion.champStadisticsNodeJS
import com.fernandoarmengol.ggwp.R
import com.fernandoarmengol.ggwp.databinding.ActivityChampBinding
import com.fernandoarmengol.ggwp.network.APIService
import com.fernandoarmengol.ggwp.dialogs.NetworkError.dialogNetworkError
import com.fernandoarmengol.ggwp.network.GlideHelper.loadImage
import com.fernandoarmengol.ggwp.network.RetrofitHelper.getRetrofitComunityDragon
import com.fernandoarmengol.ggwp.network.RetrofitHelper.getRetrofitNodeJS
import com.fernandoarmengol.ggwp.ui.adapters.ViewPager2Adapter
import com.fernandoarmengol.ggwp.ui.fragments.EstadisticasFragment
import com.fernandoarmengol.ggwp.ui.fragments.InformacionFragment
import com.google.android.material.tabs.TabLayoutMediator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ChampActivity : AppCompatActivity() {
    private lateinit var binding: ActivityChampBinding

    private lateinit var idChamp: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityChampBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val extras = intent.extras
        idChamp = extras!!.getInt("EXTRA_CHAMP").toString()

        loadData()
    }

    @SuppressLint("SetTextI18n")
    private fun loadData() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val callChampStadisticsNodeJS = getRetrofitNodeJS().create(APIService::class.java).getChampionStats("champion/$idChamp")
                val callChampCD = getRetrofitComunityDragon(getString(R.string.url_main_cd)).create(APIService::class.java).getChampCD("champions/$idChamp.json")
                if (
                    callChampStadisticsNodeJS.isSuccessful &&
                    callChampCD.isSuccessful
                ) {
                    champStadisticsNodeJS = callChampStadisticsNodeJS.body()!!
                    champCD = callChampCD.body()!!
                    runOnUiThread {
                        // Se crea el adapter.
                        val adapter = ViewPager2Adapter(supportFragmentManager, lifecycle)

                        if (champStadisticsNodeJS.bestFive.size < 4 || champStadisticsNodeJS.worstFive.size < 4) {
                            val builder = AlertDialog.Builder(this@ChampActivity)
                            builder.apply {
                                setMessage(getString(R.string.not_enough_data))
                                setPositiveButton(android.R.string.ok) { _, _ ->
                                    onBackPressed()
                                }
                            }
                            builder.show()
                        } else {
                            adapter.addFragment(EstadisticasFragment(), getString(R.string.statistics))
                            adapter.addFragment(InformacionFragment(), getString(R.string.information))

                            // Se asocia el adapter al ViewPager2.
                            binding.viewPager2.adapter = adapter

                            // Carga de las pestañas en el TabLayout.
                            TabLayoutMediator(
                                binding.tabLayout,
                                binding.viewPager2
                            ) { tab, position ->
                                tab.text = adapter.getPageTitle(position)
                            }.attach()

                            //Carga de la imagen principal y el menu
                            binding.ivChamp.bringToFront()
                            binding.txtChampName.text = champCD.name
                            binding.txtChampWinRate.text = "${champStadisticsNodeJS.winRate}%"
                            binding.txtChampPickRate.text = "${champStadisticsNodeJS.pickRate}%"

                            Glide.with(applicationContext)
                                .load("${getString(R.string.url_champ_skin)}/$idChamp/${champCD.skins.random().splashPath.split("/").last()}")
                                .into(object : DrawableImageViewTarget(binding.imgSkin) {
                                    override fun onLoadStarted(placeholder: Drawable?) {
                                        super.onLoadStarted(placeholder)
                                        binding.imgSkin.visibility = View.GONE
                                    }
                                    override fun setResource(resource: Drawable?) {
                                        super.setResource(resource)
                                        resource?.let {
                                            binding.progressBar.visibility = View.GONE

                                            binding.txtChampWinRate.visibility = View.VISIBLE
                                            binding.txtWin.visibility = View.VISIBLE
                                            binding.txtChampPickRate.visibility = View.VISIBLE
                                            binding.txtPick.visibility = View.VISIBLE
                                            binding.txtChampName.visibility = View.VISIBLE

                                            binding.imgSkin.visibility = View.VISIBLE
                                            binding.cvItem.visibility = View.VISIBLE

                                            binding.tabLayout.visibility = View.VISIBLE
                                            binding.viewPager2.visibility = View.VISIBLE
                                        }
                                    }
                                })
                            loadImage(getString(R.string.url_champ_icon) + champCD.id + ".png", binding.ivChamp)
                        }
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    dialogNetworkError(context = this@ChampActivity, getString(R.string.network_error))
                }
            }
        }
    }
}
