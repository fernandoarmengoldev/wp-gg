package com.fernandoarmengol.ggwp.ui.activities

import android.animation.ObjectAnimator
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.DividerItemDecoration
import androidx.recyclerview.widget.LinearLayoutManager
import com.bumptech.glide.Glide
import com.bumptech.glide.request.target.DrawableImageViewTarget
import com.fernandoarmengol.ggwp.GlobalVar.Companion.championSummaryCD
import com.fernandoarmengol.ggwp.R
import com.fernandoarmengol.ggwp.databinding.ActivitySummonerBinding
import com.fernandoarmengol.ggwp.dialogs.NetworkError
import com.fernandoarmengol.ggwp.model.EloNodeJS
import com.fernandoarmengol.ggwp.model.MaestriesNodeJS
import com.fernandoarmengol.ggwp.model.SummonerNodeJS
import com.fernandoarmengol.ggwp.model.match_nodejs.MatchNodeJS
import com.fernandoarmengol.ggwp.network.APIService
import com.fernandoarmengol.ggwp.network.GlideHelper.loadImage
import com.fernandoarmengol.ggwp.network.RetrofitHelper
import com.fernandoarmengol.ggwp.ui.adapters.RVMatchesAdapter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue

class SummonerActivity : AppCompatActivity() {
    private lateinit var binding: ActivitySummonerBinding

    private val adapter: RVMatchesAdapter = RVMatchesAdapter()

    private lateinit var nameSummoner: String
    private lateinit var summoner: SummonerNodeJS

    private var maestries: MutableList<MaestriesNodeJS> = ArrayList()
    private var elo: MutableList<EloNodeJS> = ArrayList()

    private var matches: MutableList<MatchNodeJS> = ArrayList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySummonerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val extras = intent.extras
        nameSummoner = extras!!.getString("EXTRA_SUMMONER").toString()

        binding.progressRV.max = 200
        loadData()
    }

    @SuppressLint("Recycle")
    private fun loadData() {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val callSummonerNodeJS = RetrofitHelper.getRetrofitNodeJS().create(APIService::class.java).getSummonerNodeJS("summoner/$nameSummoner")
                if (callSummonerNodeJS.isSuccessful) {
                    if (callSummonerNodeJS.body()!!.history[0] == "404") {
                        runOnUiThread {
                            val builder = AlertDialog.Builder(this@SummonerActivity)
                            builder.apply {
                                setMessage(getString(R.string.not_exist))
                                setPositiveButton(getString(android.R.string.ok)) { _, _ ->
                                    onBackPressed()
                                }
                            }
                            builder.setCancelable(false)
                            builder.show()
                        }
                    } else {
                        summoner = callSummonerNodeJS.body()!!

                        val callChampMaestriesNodeJS = RetrofitHelper.getRetrofitNodeJS().create(APIService::class.java).getMasteriesNodeJS("mastery/${summoner.id}")
                        val callChampEloNodeJS = RetrofitHelper.getRetrofitNodeJS().create(APIService::class.java).getEloNodeJS("elo/${summoner.id}")
                        if (callChampMaestriesNodeJS.isSuccessful && callChampEloNodeJS.isSuccessful){
                            maestries = (callChampMaestriesNodeJS.body() as MutableList<MaestriesNodeJS>?)!!
                            elo = (callChampEloNodeJS.body() as MutableList<EloNodeJS>?)!!
                            runOnUiThread {
                                loadUIData()
                            }
                        }

                        var count = 0
                        for (match in summoner.history) {
                            val callMatch = RetrofitHelper.getRetrofitNodeJS().create(APIService::class.java).getMatchNodeJS("match/$match")
                            if (callMatch.isSuccessful) {
                                if (callMatch.body()!!.info != null) {
                                    matches.add(callMatch.body()!!)
                                }
                                count++
                                runOnUiThread {
                                    ObjectAnimator.ofInt(binding.progressRV, "progress", matches.size * 10)
                                        .setDuration(500)
                                        .start()
                                    if (count >= summoner.history.size) {
                                        binding.progressRV.visibility = View.GONE
                                        setUpRecyclerView()
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    println(e)
                    NetworkError.dialogNetworkError(context = this@SummonerActivity, getString(R.string.network_error))
                }
            }
        }
    }

    @SuppressLint("SetTextI18n")
    private fun loadUIData(){
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val callChampCD = RetrofitHelper.getRetrofitComunityDragon(getString(R.string.url_main_cd)).create(APIService::class.java).getChampCD("champions/${maestries[0].championId}.json")
                if (callChampCD.isSuccessful){
                    runOnUiThread {

                        val urlRanks = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/"

                        val soloDuo = elo.find { elo -> elo.queueType == "RANKED_SOLO_5x5" }
                        val flex = elo.find { elo -> elo.queueType == "RANKED_FLEX_SR" }

                        Glide.with(applicationContext)
                            .load("${getString(R.string.url_champ_skin)}/${callChampCD.body()!!.id}/${callChampCD.body()!!.skins.random().splashPath.split("/").last()}")
                            .into(object : DrawableImageViewTarget(binding.imgSkin) {
                                override fun onLoadStarted(placeholder: Drawable?) {
                                    super.onLoadStarted(placeholder)
                                    binding.imgSkin.visibility = View.GONE
                                }
                                override fun setResource(resource: Drawable?) {
                                    super.setResource(resource)
                                    resource?.let {
                                        with(binding){
                                            progressBar.visibility = View.GONE
                                            progressRV.visibility = View.VISIBLE

                                            txtSumName.visibility = View.VISIBLE

                                            textView2.visibility = View.VISIBLE
                                            textView5.visibility = View.VISIBLE

                                            txtSoloDuo.visibility = View.VISIBLE
                                            imgSoloDuo.visibility = View.VISIBLE

                                            txtFlex.visibility = View.VISIBLE
                                            imgFlex.visibility = View.VISIBLE

                                            cvItem1.visibility = View.VISIBLE
                                            cvItem2.visibility = View.VISIBLE
                                            cvItem3.visibility = View.VISIBLE

                                            imgFlex.visibility = View.VISIBLE
                                            imgSoloDuo.visibility = View.VISIBLE

                                            txtMaestr0.visibility = View.VISIBLE
                                            txtMaestr1.visibility = View.VISIBLE
                                            txtMaestr2.visibility = View.VISIBLE

                                            divider16.visibility = View.VISIBLE
                                            divider17.visibility = View.VISIBLE

                                            txtSumName.visibility = View.VISIBLE
                                            cvItem.visibility = View.VISIBLE

                                            imgSkin.visibility = View.VISIBLE
                                        }
                                    }
                                }
                            })
                        loadImage("${getString(R.string.url_summoner_icon)}${summoner.profileIconId}.jpg", binding.ivSum)

                        with(binding){
                            txtMaestr0.text = "${championSummaryCD.find { champ -> champ.id == maestries[0].championId }!!.name}\n${maestries[0].championPoints} Points"
                            txtMaestr1.text = "${championSummaryCD.find { champ -> champ.id == maestries[1].championId }!!.name}\n${maestries[1].championPoints} Points"
                            txtMaestr2.text = "${championSummaryCD.find { champ -> champ.id == maestries[2].championId }!!.name}\n${maestries[2].championPoints} Points"
                        }

                        loadImage(getString(R.string.url_champ_icon) + maestries[0].championId + ".png", binding.ivImg1)
                        loadImage(getString(R.string.url_champ_icon) + maestries[1].championId + ".png", binding.ivImg2)
                        loadImage(getString(R.string.url_champ_icon) + maestries[2].championId + ".png", binding.ivImg3)

                        binding.txtSumName.text = nameSummoner
                        if (soloDuo != null){
                            binding.txtSoloDuo.text = "${soloDuo.tier} ${soloDuo.rank}"
                            loadImage("${urlRanks}emblem-${soloDuo.tier.lowercase()}.png", binding.imgSoloDuo)
                        } else {
                            binding.imgSoloDuo.layoutParams.height = 150
                            binding.imgSoloDuo.layoutParams.width = 150
                            loadImage("https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/border-unranked.png", binding.imgSoloDuo)
                        }
                        if (flex != null){
                            binding.txtFlex.text = "${flex.tier} ${flex.rank}"
                            loadImage("${urlRanks}emblem-${flex.tier.lowercase()}.png", binding.imgFlex)
                        } else {
                            binding.imgFlex.layoutParams.height = 150
                            binding.imgFlex.layoutParams.width = 150
                            loadImage("https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/border-unranked.png", binding.imgFlex)
                        }
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    NetworkError.dialogNetworkError(context = this@SummonerActivity, getString(R.string.network_error))
                }
            }
        }
    }

    private fun setUpRecyclerView() {
        binding.rvMatches.setHasFixedSize(true)
        binding.rvMatches.layoutManager = LinearLayoutManager(this)
        binding.rvMatches.addItemDecoration(DividerItemDecoration(this, DividerItemDecoration.VERTICAL))
        adapter.RecyclerAdapter(matches, summoner.puuid, this)
        binding.rvMatches.adapter = adapter
    }
}
